import React from "react";
import ReactDOM from "react-dom";
import { Table, Glyphicon, Checkbox } from "react-bootstrap";
import { TimePicker } from "./utils";
import moment from "moment";

class DayRow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentStartTime: props.startTime,
      currentEndTime: props.endTime
    };
 
    this.handleStartTimeChange = this.handleStartTimeChange.bind(this);
    this.handleEndTimeChange = this.handleEndTimeChange.bind(this);
    this.daySelectionChanged = this.daySelectionChanged.bind(this);
    this.checkbox = null;
  }

  handleStartTimeChange(time) {
    this.setState((prevState, props) => {
      this.props.onChange(this.checkbox.checked, time, this.state.currentEndTime);
      return { currentStartTime: time };
    });
  }

  handleEndTimeChange(time) {
    this.setState((prevState, props) => {
      this.props.onChange(
        this.checkbox.checked,
        this.state.currentStartTime,
        time
      );
      return { currentEndTime: time };
    });
  }

  daySelectionChanged() {
    this.props.onChange(
      this.checkbox.checked,
      this.state.currentStartTime,
      this.state.currentEndTime
    );
  }

  render() {
    return (
      <tr>
        <td style={{ textAlign: "left" }}>
          <Checkbox
            defaultChecked={this.props.checked}
            inputRef={c => {
                this.checkbox = c;
              }}
            onChange={this.daySelectionChanged}
          >{this.props.day}</Checkbox>
        </td>
        <td>
          <TimePicker
            start={this.props.openingTime}
            end={this.props.closingTime}
            step={15}
            value={this.state.currentStartTime}
            onChange={this.handleStartTimeChange}
          />
        </td>
        <td>
          <TimePicker
            start={this.props.openingTime}
            end={this.props.closingTime}
            step={15}
            value={this.state.currentEndTime}
            onChange={this.handleEndTimeChange}
          />
        </td>
      </tr>
    );
  }
}

export default class TimeTable extends React.Component {
  constructor(props) {
    super(props);

    this.dayChanged = this.dayChanged.bind(this);
  }

  componentDidMount() {
    this.timeTable = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined };
    this.props.days.forEach((d, i) => {
      this.timeTable[i+1] = d;
    });
    this.props.onChange(this.timeTable);
  }

  dayChanged(weekDay, checked, startTime, endTime) {
    if (checked) {
      this.timeTable[weekDay] = [ startTime, endTime ];
    } else {
      this.timeTable[weekDay] = null;
    }

    this.props.onChange(this.timeTable);
  }

  render() {
    const weekdays = moment.weekdays(true);
    
    return (
      <Table striped bordered condensed hover>
        <thead>
          <tr>
            <th>Jour</th>
            <th>
              <span><Glyphicon glyph="time" />Arrivée</span>
            </th>
            <th>
              <span><Glyphicon glyph="time" />Départ</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {this.props.days.map((d,i) => {
              // d is undefined means 'no day within range',
              // d is null means 'not selected',
              // otherwise d contains start,end
              let start = this.props.openingTime;
              let end = this.props.closingTime;
              if (d === undefined) { return };
              if (d !== null) {
                start  = d[0];
                end = d[1];
              }

              return (
                <DayRow
                  day={weekdays[i]}
                  startTime={start}
                  endTime={end}
                  openingTime={this.props.openingTime}
                  closingTime={this.props.closingTime}
                  checked={d!==null}
                  onChange={(checked, startTime, endTime) => {
                      this.dayChanged(i+1, checked, startTime, endTime);
                    }}
                />
              );
            })}
        </tbody>
      </Table>
    );
  }
}
