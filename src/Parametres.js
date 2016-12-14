import React from 'react';
import ReactDOM from 'react-dom';
import TimePicker from 'react-bootstrap-time-picker';
import DatePicker from 'react-bootstrap-date-picker';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal, Checkbox } from 'react-bootstrap';
import auth from './auth';
import { checkStatus, parseJSON, AddressFields } from './utils';

export default class Parametres extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { busy: false, enableSave: false, opening_hours: [8,19], changesAllowed: false, applyCeiling: false, contractStart: new Date().toISOString(), contractEnd: new Date().toISOString() };

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
  }

  componentDidMount() {
    this.setState({ busy: true });
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
                       applyCeiling : res.applyCeiling === '1'});
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

  render() {
    if (this.state.busy) {
      return <img className="centered" src="spinner.gif"/>
    }

    const opening_hour = this.state.opening_hours[0]*3600;
    const closing_hour = this.state.opening_hours[1]*3600;

    return (
      <Grid>
        <Row>
          <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <Button bsStyle="primary" disabled={!this.state.enableSave} onClick={this.save}>Enregistrer</Button>
          </div>
        </Row>
        <hr/>
        <Row>
          <Col lg={12}>
            <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Nom de l'établissement</Col>
                  <Col sm={4}>
                     <FormControl readOnly={true} type="text" value={this.state.name}/>
                  </Col>
                </FormGroup>
            </Form>
            <AddressFields valueChanged={this.addressChanged} ref={(c)=>{this.addressFields=c}}/>
            <hr/>
            <Form horizontal>
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
            </Form>
          </Col>
        </Row>
        <hr/>
        <Row>
          <Col lg={12}>
            <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Tarif plafond CAF</Col>
                  <Col sm={4}>
                    <Checkbox inputRef={(c) => { this.chkApplyCeiling = c }} checked={this.state.applyCeiling} onChange={this.applyCeilingChanged}>Appliquer</Checkbox>
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
        </Row>
      </Grid>
    );
  }
}
