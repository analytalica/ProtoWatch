React.initializeTouchEvents(true);
var shouldModulesUpdate = true;

/* The labelDictionary maps labels to index values.
   Due to the large number of possible contexts with which labelDictionary can be
   referred to, it is one of the few designated global variables in ProtoWatch.
 */
var labelDictionary = {};

function pad2(str) {
    str = '' + str;
    return str.length < 2 ? ('0' + str) : str;
}

function quickClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function quickEqual(obj1, obj2) { //Might break in the future, but works for now.
    return (JSON.stringify(obj1) == JSON.stringify(obj2));
}

var Stopwatch = React.createClass({
    getInitialState: function () {
        console.log('getInitialState was called');
        var gIS_endTime = 0;
        var gIS_timerValue = 0;
        if (!this.props.countUp) {
            gIS_endTime = Date.now().valueOf() + this.props.timerMax;
            gIS_timerValue = this.props.timerMax;
        }
        return {
            startTime: Date.now().valueOf(),
            endTime: gIS_endTime,
            timerValue: gIS_timerValue,
            running: this.props.autorun,
            lastButtonEvent: "none"
        };
    },

    componentDidMount: function () {
        console.log('componentDidMount was called');
        this.interval = setInterval(this.tick, 5);
    },

    componentWillUnmount: function () {
        console.log('componentWillUnmount was called');
        clearInterval(this.interval);
    },

    componentWillReceiveProps: function (nextProps) {
        console.log('componentWillReceiveProps was called');
        var newTimerValue = this.state.endTime - Date.now().valueOf();
        if (!nextProps.countUp && !(!this.props.countUp && (!(nextProps.timerMax > 0) || newTimerValue < nextProps.timerMax))) { //currently counting up, but count down next
            console.log('Time to correctStartEndTimes! Counting up, should count down next');
            this.correctStartEndTimes(nextProps);
        } else if (nextProps.countUp && !this.props.countUp) { //currently counting down, but count up next
            console.log('Time to correctStartEndTimes! Counting down, should count up next');
            this.correctStartEndTimes(nextProps);
        }

        if (!this.state.running) {
            /* Some special cases: if the timer is paused, and a new timerMax is received, update the timerValue
             as a user would reasonably expect. */
            if (this.state.timerValue == 0 && !nextProps.countUp && nextProps.timerMax > 0) {
                this.setState({
                    timerValue: nextProps.timerMax
                });
            } else if (this.state.timerValue == this.props.timerMax && !this.props.countUp && nextProps.countUp) {
                this.setState({
                    timerValue: 0
                });
            } else if (!this.props.countUp && !nextProps.countUp && nextProps.timerMax < this.state.timerValue) {
                this.setState({
                    timerValue: nextProps.timerMax
                });
            }
            /* A case we're not accounting for here is if the timer is paused, ticking down, and it gets updated
             with a timerMax that's higher than the current timerValue. We'll preserve the current timer value in case
             someone doesn't want it to be overridden. */
        }
    },

    toggle: function (event) {
        event.preventDefault();
        if (this.state.running)
            this.pause();
        else
            this.resume();
    },

    pause: function () {
        this.setState({
            running: false
        })
    },

    resume: function () {
        console.log('Resuming: ');
        if (!this.state.running) {
            this.correctStartEndTimes(this.props);
        }
        this.setState({
            running: true
        })
    },

    reset: function (event) { //optional: pass in an event parameter.
        event.preventDefault();
        if (this.props.countUp) {
            this.setState({
                timerValue: 0,
                running: false
            })
        } else {
            this.setState({
                timerValue: this.props.timerMax,
                running: false
            })
        }
    },

    tick: function () {
        var currState = this.state;
        if (currState.running) {
            var currProps = this.props;
            var newTimerValue;
            if (currProps.countUp) {
                newTimerValue = Date.now().valueOf() - currState.startTime;
                if (currProps.timerMax == 0 || newTimerValue < currProps.timerMax) {
                    this.setState({
                        timerValue: newTimerValue
                    })
                } else {
                    currProps.s_onLimit();
                }
            } else {
                newTimerValue = currState.endTime - Date.now().valueOf();
                if (newTimerValue >= 0) {
                    this.setState({
                        timerValue: newTimerValue
                    })
                } else {
                    currProps.s_onLimit();
                }
            }
        }
    },

    //reset the start/end times based on the current timerValue
    correctStartEndTimes: function (nextProps) {
        console.log('correctStartEndTimes was called');
        console.log('Correcting StartEndTimes: nextProps.countUp: ' + nextProps.countUp
        + ', this.props.countUp: ' + this.props.countUp);
        if (nextProps.countUp) { //switch counting down to up
            this.setState({
                startTime: Date.now().valueOf() - this.state.timerValue
            })
        } else {
            var endTimeOffset = this.state.timerValue;
            if (nextProps.timerMax > 0 && this.state.timerValue > nextProps.timerMax) {
                endTimeOffset = nextProps.timerMax;
            }
            this.setState({
                endTime: Date.now().valueOf() + endTimeOffset
            })
        }
    },

    previous: function () { //optional: pass in an event parameter.
        this.props.s_onPrevious();
    },

    next: function () { //optional: pass in an event parameter.
        this.props.s_onNext();
    },

    render: function () {
        //compute display timer values
        var tValue = this.state.timerValue;
        var cs = Math.floor(tValue % 1000 / 10);
        var sec = Math.floor(tValue / 1000) % 60;
        var min = Math.floor(tValue / 60000) % 60;
        var hrs = Math.floor(tValue / 3600000);
        var display = [];
        display.push(pad2(min));
        display.push(pad2(sec));
        display.push(pad2(cs));

        //determine toggleButton state
        var toggleButton;
        if (this.state.running)
            toggleButton = <i className="fa fa-pause"></i>;
        else
            toggleButton = <i className="fa fa-play"></i>;
        return (
            <div className="mainWrapper noSelect">
                <p className="mainWatch">
                    <span id="hourDisplay">{pad2(hrs)}:</span>{display.join(':')}</p>
                <p className="mainLinks">
                    <span>
                        <span className="mainLinksWrapper">
                            <a className="leftRightButton hvr-sweep-to-left" href="javascript:void(0)" onTouchStart={this.previous} onMouseDown={this.previous}>
                                <i className="fa fa-step-backward doubleArrow"></i>
                            </a>
                            <a id="toggleButton" className="bigButton" href="javascript:void(0)" onTouchStart={this.toggle} onMouseDown={this.toggle}>{toggleButton}</a>
                            <a id="resetButton" className="bigButton" href="javascript:void(0)" onTouchStart={this.reset} onMouseDown={this.reset}>
                                <i className="fa fa-undo fa-flip-horizontal"></i>
                            </a>
                            <a className="leftRightButton hvr-sweep-to-right" href="javascript:void(0)" onTouchStart={this.next} onMouseDown={this.next}>
                                <i className="fa fa-step-forward doubleArrow"></i>
                            </a>
                        </span>
                    { /* <span className="lowerLinksWrapper">
                     <a className="leftRightButton" href="javascript:void(0)" onTouchStart={this.previous} onMouseDown={this.previous}>
                     <i className="fa fa-step-backward doubleArrow"></i>
                     </a>
                     <a className="leftRightButton" href="javascript:void(0)" onTouchStart={this.next} onMouseDown={this.next}>
                     <i className="fa fa-step-forward doubleArrow"></i>
                     </a>
                     </span> */ }
                    </span>
                </p>
            </div>
        )
    }
});

var Module = React.createClass({
    getInitialState: function () {
        var fields = this.computeOldTimerMaxFields();
        return {
            labelField: this.props.label,
            hrsField: pad2(fields.hrs),
            minField: pad2(fields.min),
            secField: pad2(fields.sec),
            csField: pad2(fields.cs)
        }
    },

    handlePropUpdate: function (newProps) {
        this.props.m_moduleUpdate(newProps);
    },

    log: function (message) {
        console.log('id: ' + this.props.id + ' : ' + message);
    },

    blankField: function (event) {
        //this.log('className: ' + this.refs.confirmButton.getDOMNode().className);
        event.target.value = '';
    },

    padOnBlur: function (event) {
        var newState = {};
        newState[event.target.dataset.tag] = pad2(this.state[event.target.dataset.tag]);
        this.setState(newState);
        //this.forceUpdate();
    },

    handleFieldChange: function (event) {
        var newState = {};
        newState[event.target.dataset.tag] = (event.target.value).trim();
        this.setState(newState);
    },

    /* Fields above the break are updated in real time. They get their own update functions. */
    updateAutorun: function (event) {
        var newAutorun = event.target.checked;
        this.log('updateAutorun was called. value: ' + newAutorun);
        var newProps = quickClone(this.props);
        newProps.autorun = newAutorun;
        this.handlePropUpdate(newProps);
    },

    updateCountUp: function (event) {
        this.log('updateCountUp was called. value: ' + event.target.value);
        var newCountUp = (event.target.value == 'true'); //convert to boolean
        if (this.props.countUp != newCountUp) {
            var newProps = quickClone(this.props);
            newProps.countUp = newCountUp;
            this.handlePropUpdate(newProps);
        }
    },

    resetFormFields: function () {
        //We will consider prop data "old data".
        this.log('resetFormFields was called.');
        var fields = this.computeOldTimerMaxFields();
        this.setState({
            labelField: this.props.label,
            hrsField: pad2(fields.hrs),
            minField: pad2(fields.min),
            secField: pad2(fields.sec),
            csField: pad2(fields.cs)
        });

        this.setUpdateButton();
    },

    /* Take the modified contents of form fields and update this module's props with them. */
    updateFormFields: function () {
        this.log('updateTimerMax was called.');
        if (this.validateInput()) {
            var newProps = quickClone(this.props);
            var newTimerMax = this.computeNewTimerMax();

            this.log('newTimerMax: ' + newTimerMax);
            newProps.timerMax = newTimerMax;
            newProps.label = this.state.labelField;

            this.handlePropUpdate(newProps);
        }
        /*
         Don't add any code after this, as the function will run in the context of the old props.
         Put code inside componentDidUpdate instead.
         */
    },

    shouldComponentUpdate: function () { //optional parameters nextProps, nextState
        return shouldModulesUpdate;
    },

    componentDidUpdate: function () {
        this.log('Module component updated!');

        /*
         Here we have a special case where the updated state don't precisely reflect the input.
         Typically, updated state reflects the previous input, and this.setUpdateButton() will hide
         the update button. However, because we want to support inline conversion (say, 120 sec -> 2 min),
         the new timerMax prop won't always exactly match the previous state. So, just to make sure,
         we'll manually reset all the form fields.
         */

        if (this.verifyTimerMaxFields(false)) {
            var newTimerMax = this.computeNewTimerMax();
            if (this.props.timerMax == newTimerMax) {
                this.resetFormFields();
            }
        }
        this.setUpdateButton();
    },

    computeOldTimerMaxFields: function () {
        var tMax = this.props.timerMax;
        var fields = {};
        fields.cs = Math.floor(tMax % 1000 / 10);
        fields.sec = Math.floor(tMax / 1000) % 60;
        fields.min = Math.floor(tMax / 60000) % 60;
        fields.hrs = Math.floor(tMax / 3600000);
        return fields;
    },

    computeNewTimerMax: function () {
        var newTimerMax = (parseInt(this.state.hrsField, 10) * 3600000);
        newTimerMax += (parseInt(this.state.minField, 10) * 60000);
        newTimerMax += (parseInt(this.state.secField, 10) * 1000);
        newTimerMax += (parseInt(this.state.csField, 10) * 10);
        return newTimerMax;
    },

    verifyTimerMaxFields: function (canMatchExistingValues) {
        var original = this.computeOldTimerMaxFields();
        var update = {};
        update.hrs = parseInt(this.state.hrsField, 10);
        update.min = parseInt(this.state.minField, 10);
        update.sec = parseInt(this.state.secField, 10);
        update.cs = parseInt(this.state.csField, 10);
        return ((update.hrs >= 0 && update.min >= 0 && update.sec >= 0 && update.cs >= 0)
        && (canMatchExistingValues || original.hrs != update.hrs || original.min != update.min || original.sec != update.sec || original.cs != update.cs));
    },

    setUpdateButton: function () { //All fields must be verified for the update button to be untucked.
        this.log('setUpdateButton was called.');
        if (this.validateInput()) {
            this.log('Revealing update button...');
            this.refs.updateButtonWrapper.getDOMNode().className += ' untucked';
        } else {
            this.refs.updateButtonWrapper.getDOMNode().className = 'updateButtonWrapper';
        }
    },

    validateInput: function () { //Logic: "If at least one of them has changed, AND all of them are valid"
        return (this.verifyTimerMaxFields(false) || this.state.labelField != this.props.label)
        && (this.verifyTimerMaxFields(true) && this.state.labelField != '');
    },

    playSound_bloop_d: function () {
        document.getElementById('sounds_bloop_d').play()
    },
    playSound_bloop_g: function () {
        document.getElementById('sounds_bloop_g').play()
    },

    render: function () {
        var upToDownFrom;
        //Set countUp/countDown limit text
        if (this.props.countUp)
            upToDownFrom = 'Up Towards:';
        else
            upToDownFrom = 'Down From:';

        return (
            <div id={this.props.id} className="Module">
                <div className="tabs">
                    <div className="tab">
                        <input type="radio" id={this.props.id + '-1'} name={this.props.id} defaultChecked={true} />
                        <label htmlFor={this.props.id + '-1'}>
                            Main Settings</label>
                        <div className="content">
                            <table>
                                <tr>
                                    <td className="tableLeft">Run Automatically:</td>
                                    <td className="tableRight">
                                        <input type="checkbox"
                                            defaultChecked={this.props.autorun}
                                            onChange={this.updateAutorun}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="tableLeft">Count Direction:</td>
                                    <td className="tableRight">
                                        <select value={'' + this.props.countUp} onChange={this.updateCountUp}>
                                            <option value="true">up</option>
                                            <option value="false">down</option>
                                        </select>
                                    </td>
                                </tr>
                            </table>
                            <div className="updatableDivider"></div>
                            <div className="updatableWrapper">
                                <table>
                                    <tr>
                                        <td className="tableLeft">Label:</td>
                                        <td className="tableRight">
                                            <input type="text"
                                                value={this.state.labelField}
                                                onChange={this.handleFieldChange}
                                                data-tag="labelField" ref="labelField"
                                            />
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <div className="updatableWrapper limitInputWrapper">
                                <p>Count {upToDownFrom}</p>
                                {/* We use data-tag to identify elements and ref to select them */}
                                <input type="text"
                                    value={this.state.hrsField}
                                    onFocus={this.blankField}
                                    onBlur={this.padOnBlur}
                                    onChange={this.handleFieldChange}
                                    data-tag="hrsField" ref="hrsField"
                                />
                                :
                                <input type="text"
                                    value={this.state.minField}
                                    onFocus={this.blankField}
                                    onBlur={this.padOnBlur}
                                    onChange={this.handleFieldChange}
                                    data-tag="minField" ref="minField"
                                />
                                :
                                <input type="text"
                                    value={this.state.secField}
                                    onFocus={this.blankField}
                                    onBlur={this.padOnBlur}
                                    onChange={this.handleFieldChange}
                                    data-tag="secField" ref="secField"
                                />
                                :
                                <input type="text"
                                    value={this.state.csField}
                                    onFocus={this.blankField}
                                    onBlur={this.padOnBlur}
                                    onChange={this.handleFieldChange}
                                    data-tag="csField" ref="csField"
                                />
                                <p className="limitInputLabel">Hours : Minutes : Seconds : Centisecs </p>
                            </div>
                        </div>
                    </div>
                    <div className="tab">
                        <input type="radio" id={this.props.id + '-2'} name={this.props.id} />
                        <label htmlFor={this.props.id + '-2'}>
                            Sounds</label>
                        <div className="content">
                            <button onClick={this.playSound_bloop_g}>Play a Bloop G</button>
                            <button onClick={this.playSound_bloop_d}>Play a Bloop D</button>
                            <div className="updatableDivider"></div>
                        </div>
                    </div>
                </div>
                <div className="updateButtonWrapper" ref="updateButtonWrapper">
                    <button type="button"
                        ref="moduleLimitButton"
                        onClick={this.updateFormFields}>Update</button>
                    <button type="button"
                        ref="moduleLimitButton"
                        onClick={this.resetFormFields} data-tag="resetButton">Revert</button>
                </div>
            </div>
        );
    }
});

var Main = React.createClass({
    getInitialState: function () {
        var initialModuleProps = this.getDefaultModuleProps(true);
        labelDictionary[initialModuleProps.label] = 0;
        return {
            modules: [<Module {...initialModuleProps} />],
            activeIndex: 0,
            previousActiveIndex: -1
        };
    },

    createDefaultModule: function () {
        return (
            <Module {...this.getDefaultModuleProps(false)} />
        )
    },

    getDefaultModuleProps: function (firstModule) {
        var props = {
            id: Date.now().valueOf(),
            autorun: false,
            timerMax: 0,
            countUp: true,
            m_moduleUpdate: this.moduleUpdate,
            s_onLimit: this.next, //make sure to also update moduleUpdate with new function props
            s_onNext: this.next,
            s_onPrevious: this.previous
        };
        if(firstModule)
            props.label = 'Stopwatch0';
        else
            props.label = 'Stopwatch' + this.state.modules.length;
        return props;
    },

    moduleUpdate: function (newProps) {
        var moduleID = newProps.id;
        //console.log('Updating module ' + moduleID);
        var moduleIndex;
        for (moduleIndex = 0; moduleIndex < this.state.modules.length; moduleIndex++) { //TODO: make this not so O(n)
            if (this.state.modules[moduleIndex].props.id == moduleID)
                break;
        }
        console.log('Updating module ' + moduleID + '...with index ' + moduleIndex);
        var newModuleList = this.state.modules;
        var newModuleProps = newProps;

        //update these with function props
        newModuleProps.m_moduleUpdate = this.moduleUpdate;
        newModuleProps.s_onLimit = this.next;
        newModuleProps.s_onNext = this.next;
        newModuleProps.s_onPrevious = this.previous;

        newModuleList[moduleIndex] = <Module {...newModuleProps} />;
        this.setState({
            modules: newModuleList //TODO: make this not so O(n^2)
        })
    },

    next: function () {
        console.log('next was called.');
        var nextIndex = this.state.activeIndex + 1;
        if (nextIndex >= this.state.modules.length)
            nextIndex = 0;
        this.cycleActive(this.state.activeIndex, nextIndex);
    },

    previous: function () {
        console.log('previous was called.');
        var nextIndex = this.state.activeIndex - 1;
        if (nextIndex < 0)
            nextIndex = this.state.modules.length - 1;
        this.cycleActive(this.state.activeIndex, nextIndex);
    },

    cycleActive: function (currentIndex, nextIndex) {
        if (currentIndex != nextIndex) {
            shouldModulesUpdate = false;
            this.setState({
                activeIndex: nextIndex,
                previousActiveIndex: currentIndex
            })
        }
    },

    add: function () {
        console.log('add was called.');
        var newModules = this.state.modules;
        console.log('newModules.length: ' + newModules.length);
        var newStopwatchModule = this.createDefaultModule();
        newModules.push(newStopwatchModule);
        this.setState({
            modules: newModules
        })
    },

    render: function () {
        var currentActiveStopwatch = this.state.modules[this.state.activeIndex];
        return (
            <div>
                <Stopwatch
                {...currentActiveStopwatch.props}
                    key={currentActiveStopwatch.props.id}
                />
                <div id="moduleList">
                {this.state.modules}
                    <div id="addModuleButton" className="Module noSelect" onClick={this.add}>
                        <p>+</p>
                    </div>
                </div>
                <p>{currentActiveStopwatch.props.id}</p>
            </div>
        )
    },

    componentDidMount: function () {
        console.log('Main component mounted!');
        this.componentDidUpdate(null, {activeIndex: -1});
    },

    componentDidUpdate: function (prevProps, prevState) {
        console.log('Main component updated!');
        shouldModulesUpdate = true;
        if (this.state.activeIndex != prevState.activeIndex) {
            if (this.state.previousActiveIndex != -1)
                document.getElementById(this.state.modules[this.state.previousActiveIndex].props.id).classList.toggle('activeModule');
            document.getElementById(this.state.modules[this.state.activeIndex].props.id).classList.toggle('activeModule');
        }
    }
});

React.render(
    <Main />
    ,
    document.getElementById('container')
);
