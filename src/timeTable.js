import React from 'react';
import ReactDOM from 'react-dom';
import { Table, Glyphicon, Checkbox } from 'react-bootstrap';
import TimePicker from 'react-bootstrap-time-picker';
import moment from 'moment';

class DayRow extends React.Component {
  constructor(props) {
    super(props);

    this.state = { currentStartTime: this.props.openingTime, currentEndTime: this.props.closingTime };
    this.handleStartTimeChange = this.handleStartTimeChange.bind(this);
    this.handleEndTimeChange = this.handleEndTimeChange.bind(this);
    this.daySelectionChanged = this.daySelectionChanged.bind(this);
    this.checkbox = null;
  }

  handleStartTimeChange(time) {
    this.setState({ currentStartTime: time });
    this.props.onChange(this.checkbox.checked, time, this.state.currentEndTime);
  }

  handleEndTimeChange(time) {
    this.setState({ currentEndTime: time });
    this.props.onChange(this.checkbox.checked, this.state.currentStartTime, time);
  }

  daySelectionChanged() {
    this.props.onChange(this.checkbox.checked, this.state.currentStartTime, this.state.currentEndTime);
  }

  render() {
    return <tr>
            <td style={{textAlign: 'left'}}><Checkbox defaultChecked inputRef={(c) => { this.checkbox = c }} onChange={this.daySelectionChanged}>{this.props.day}</Checkbox></td>
            <td><TimePicker start={this.props.openingTime} end={this.props.closingTime} format={24} value={this.state.currentStartTime} onChange={this.handleStartTimeChange}/></td>
            <td><TimePicker start={this.state.openingTime} end={this.state.closingTime} format={24} value={this.state.currentEndTime} onChange={this.handleEndTimeChange}/></td>
          </tr>
  }
}

export default class TimeTable extends React.Component {
  constructor(props) {
    super(props);
  
    this.dayChanged = this.dayChanged.bind(this);
  }

  componentDidMount() {
    this.timeTable = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.props.days.forEach((d, i)=>{ this.timeTable[d]=[this.props.openingTime,this.props.closingTime] }); 
    this.props.onChange(this.timeTable);
  }

  dayChanged(weekDay, checked, startTime, endTime) {
    if (checked) {
      this.timeTable[weekDay] = [startTime, endTime];
    } else {
      this.timeTable[weekDay] = null;
    }

    this.props.onChange(this.timeTable);
  }

  render() {
      const weekdays = moment.weekdays(true);

      return (<Table striped bordered condensed hover>
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
         { this.props.days.map((d) => { return <DayRow day={weekdays[d-1]} openingTime={this.props.openingTime} closingTime={this.props.closingTime} onChange={(checked,startTime,endTime)=>{this.dayChanged(d, checked, startTime, endTime)}}/>}) } 
        </tbody>
      </Table>);
  }
}
    
