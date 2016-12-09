import React from 'react';
import ReactDOM from 'react-dom';
import DatePicker from 'react-bootstrap-date-picker';
import ReactBootstrapSlider from 'react-bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.min.css!';
import './css/Horaires.css!';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal, Checkbox } from 'react-bootstrap';
import ChildData from './child.js';
import auth from './auth';
import { checkStatus, parseJSON } from './utils';

export default class Horaires extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { children: [], opening_hours: [8,19], date: new Date().toISOString() };

    this.formatHour = this.formatHour.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.getChildrenList = this.getChildrenList.bind(this);
  }

  getChildrenList(date) {
    // get children list
    fetch("/children/"+date, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ children: res });
    });
  }

  componentWillMount() {
    this.getChildrenList(this.state.date); 

    // get opening hours
    fetch("/opening_hours", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ opening_hours: res });
    });
  }

  formatHour(m) {
    // m: minutes or array for range of minutes
    if (m.constructor === Array) {
      return this.formatHour(m[0])+" - "+this.formatHour(m[1]);
    } else {
      const hh = ("0"+Math.floor(m/60)).slice(-2);
      const mm = ("0"+(m % 60)).slice(-2);
      return `${hh}:${mm}`;
    }
  }

  dateChanged(isodate) {
    this.setState({date: isodate});
    this.getChildrenList(isodate);
  }

  render() {
    const opening_hour = this.state.opening_hours[0]*60;
    const closing_hour = this.state.opening_hours[1]*60;

    return (
      <Grid>
        <Row>
          <Col lg={8} lgOffset={2}>
            <DatePicker monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                        dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']} 
                        dateFormat="DD/MM/YYYY" 
                        value={this.state.date} showClearButton={false} onChange={this.dateChanged}/>
          </Col>
        </Row>
        <Row><Col lg={12}>
        { this.state.children.map((c, i) => {
            return (<Row>
                      <Col lg={5}>
                        <h3>{c.surname + " " + c.name}</h3>
                      </Col>
                      <Col lg={5}>
                        <div style={{marginTop: '20px' }}>
                          <ReactBootstrapSlider value={[opening_hour,opening_hour]} min={opening_hour} max={closing_hour} formatter={this.formatHour} rangeHighlights={[{start:opening_hour,end:c.contractStart*60},{start:c.contractEnd*60, end: closing_hour}]}/>
                        </div>
                      </Col>
                      <Col lg={2}>
                        <div style={{marginTop: '10px' }}>
                          <Button bsStyle="success"><Glyphicon glyph="ok"/></Button> 
                          <Button bsStyle="danger"><Glyphicon glyph="remove"/></Button> 
                          <Button bsStyle="primary"><Glyphicon glyph="repeat"/></Button> 
                        </div>
                      </Col>
                   </Row>);
            })
        }
        </Col></Row>
      </Grid>
    );
  }
}
