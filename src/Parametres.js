import React from 'react';
import ReactDOM from 'react-dom';
import TimePicker from 'react-bootstrap-time-picker';
import DatePicker from 'react-bootstrap-date-picker';
import { Calendar } from 'react-yearly-calendar';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal, Checkbox, Nav, NavItem, Tabs, Tab } from 'react-bootstrap';
import auth from './auth';
import { isWeekend, isHoliday, isBankHoliday, checkStatus, parseJSON, AddressFields } from './utils';
import moment from 'moment';
import 'moment-range';
import 'moment/locale/fr';
import './css/calendar.css!';

export default class Parametres extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    const today = moment();
    const last_year = moment(today.add(-1, "years"));
    this.state = { currentTab: 0, currentRange: [last_year,last_year], closedDays: [], holidays: [], busy: false, enableSave: false, opening_hours: [8,19], changesAllowed: false, applyCeiling: false, contractStart: new Date().toISOString(), contractEnd: new Date().toISOString() };

    this.chkApplyCeiling = undefined;
    this.addressFields = undefined;
    this.allowChanges = this.allowChanges.bind(this);
    this.setOpeningHour = this.setOpeningHour.bind(this);
    this.setClosingHour = this.setClosingHour.bind(this);
    this.save = this.save.bind(this);
    this.contractStartChanged = this.contractStartChanged.bind(this);
    this.contractEndChanged = this.contractEndChanged.bind(this);
    this.applyCeilingChanged = this.applyCeilingChanged.bind(this);
    this.addressChanged = this.addressChanged.bind(this);
    this.onPickRange = this.onPickRange.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);
  }

  componentWillMount() {
    moment.locale('fr');
    this.setState({ busy: true });
  }

  componentDidMount() {
    fetch("/holidays", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ holidays: res });
    });

    fetch("/parameters", {
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ busy: false,
                       name: res.name,
                       opening_hours: [res.opening, res.closing],
                       changesAllowed: res.contractChangesAllowed === '1',
                       contractEnd: res.contractEnd != "" ? res.contractEnd : this.state.contractEnd,
                       contractStart: res.contractStart != "" ? res.contractStart : this.state.contractStart,
                       applyCeiling : res.applyCeiling === '1' });
        this.addressFields.setFormValues(res);
    });
  }

  allowChanges() {
    fetch("/allowContractChanges", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ allowChanges: !this.state.changesAllowed })
    }).then(checkStatus).then(() => {
      this.setState({ changesAllowed: !this.state.changesAllowed });
    });
  }

  setOpeningHour(time) {
    const hours = this.state.opening_hours;
    hours[0] = time/3600;
    this.setState({ enableSave: true, opening_hours });
  }

  setClosingHour(time) {
    const hours = this.state.opening_hours;
    hours[1] = time/3600;
    this.setState({ enableSave: true, opening_hours });
  }

  addressChanged(key, value) {
    this.setState({ enableSave: true });
  }

  save() {
    fetch("/saveParameters", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ contractChangesAllowed: this.state.changesAllowed ? "1" : "0",
                             closing: this.state.opening_hours[1],
                             opening: this.state.opening_hours[0],
                             contractEnd: this.state.contractEnd,
                             contractStart: this.state.contractStart,
                             applyCeiling: this.chkApplyCeiling.checked ? "1" : "0",
                             ...this.addressFields.getData() })
    }).then(checkStatus).then(() => {
      this.setState({ enableSave: false });
    });
  }

  contractStartChanged(isodate) {
    this.setState({ enableSave: true, contractStart: isodate });
  }
  
  contractEndChanged(isodate) {
    this.setState({ enableSave: true, contractEnd: isodate });
  }

  applyCeilingChanged() {
    this.setState({ enableSave: true, applyCeiling: this.chkApplyCeiling.checked });
  }

  onPickRange(start,end) {
    const days = this.state.closedDays;
    const r = moment.range(start, end);
    r.by('days', (d)=>{
      days.push(d);
    });
    this.setState({ closedDays: days });
  }

  handleTabSelect(key) {
    this.setState({ currentTab: key });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="spinner.gif"/>
    }

    const contractYear = moment(this.state.contractStart).year();
    const opening_hour = this.state.opening_hours[0]*3600;
    const closing_hour = this.state.opening_hours[1]*3600;
    const contractRange = moment.range([moment(this.state.contractStart), moment(this.state.contractEnd)]);

    const customCss = {
      holiday: (day) => { return isHoliday(day, this.state.holidays) },
      weekend: (day) => { return isWeekend(day) || isBankHoliday(day) || !day.within(contractRange) },
      closedDay: (day) => { return this.state.closedDays.some((d)=>{ return d.isSame(day) }) }
    }

    let contents = '';
    if (this.state.currentTab == 0) {
      contents = (<div style={{marginTop: '15px'}}>
                <Col lg={12}>
                    <Form horizontal>
                        <FormGroup>
                          <Col sm={2} componentClass={ControlLabel}>Nom de l'établissement</Col>
                          <Col sm={4}>
                             <FormControl readOnly={true} type="text" value={this.state.name}/>
                          </Col>
                        </FormGroup>
                    </Form>
                    <AddressFields valueChanged={this.addressChanged} ref={(ref) => { this.addressFields = ref; }}/>
                  </Col>
              </div>);
    } else if (this.state.currentTab == 1) {
      contents = (<div style={{marginTop: '15px'}}>
                  <Col lg={12}>
                    <Form horizontal>
                        <FormGroup>
                          <Col sm={2} componentClass={ControlLabel}>Tarif plafond CAF</Col>
                          <Col sm={4}>
                            <Checkbox inputRef={(c) => { this.chkApplyCeiling = c }} checked={this.state.applyCeiling} onChange={this.applyCeilingChanged}>Appliquer</Checkbox>
                          </Col>
                        </FormGroup>
                        <FormGroup>
                          <Col sm={2} componentClass={ControlLabel}>Heure ouverture</Col>
                          <Col sm={4}>
                            <TimePicker start="6" end="21" format={24} value={opening_hour} onChange={this.setOpeningHour}/>
                          </Col>
                          <Col sm={2} componentClass={ControlLabel}>Heure fermeture</Col>
                          <Col sm={4}>
                            <TimePicker start='6' end='21' format={24} value={closing_hour} onChange={this.setClosingHour}/>
                          </Col>
                        </FormGroup>
                      <FormGroup>
                        <Col sm={2} componentClass={ControlLabel}>Contrats du</Col>
                        <Col sm={4}>
                          <DatePicker  monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                                dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']}
                                dateFormat="DD/MM/YYYY"
                                value={this.state.contractStart} showClearButton={false} onChange={this.contractStartChanged}/>
                        </Col>
                        <Col sm={2} componentClass={ControlLabel}>au</Col>
                        <Col sm={4}>
                          <DatePicker  monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                                dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']}
                                dateFormat="DD/MM/YYYY"
                                value={this.state.contractEnd} showClearButton={false} onChange={this.contractEndChanged}/>
                        </Col>
                      </FormGroup>
                    </Form>
                    <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
                      <Button bsStyle={this.state.changesAllowed ? "danger" : "success"} onClick={this.allowChanges}>{this.state.changesAllowed ? "Fermer contrats" : "Permettre les modifications de contrat"}</Button>
                    </div>
                  </Col>
             </div>);
    } else {
      contents = (<div style={{marginTop: '15px', position:'relative', textAlign: 'center'}}>
           <Calendar year={contractYear} firstDayOfWeek={0} showWeekSeparators={true} selectRange selectedRange={this.state.currentRange} onPickRange={this.onPickRange}  customClasses={customCss} />
        </div>);
    }

    return (
      <Grid>
        <Row>
          <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <Button bsStyle="primary" disabled={!this.state.enableSave} onClick={this.save}>Enregistrer</Button>
          </div>
        </Row>
        <Row>
        <Nav bsStyle="tabs" activeKey={this.state.currentTab} onSelect={this.handleTabSelect}>
          <NavItem eventKey={0}>Général</NavItem>
          <NavItem eventKey={1}>Contrats</NavItem>
          <NavItem eventKey={2}>Jours fériés et de fermeture</NavItem>
        </Nav>
        </Row>
        <Row>
        {contents}
        </Row>
      </Grid>
    );
  }
}
