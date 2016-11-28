import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal, Checkbox } from 'react-bootstrap';
import ChildData from './child.js';
import auth from './auth';
import 'isomorphic-fetch';

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json()
}

class TextInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = { value: "" };
    this.textChanged = this.textChanged.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.state = { value: nextProps.valueObject[nextProps.valueKey] };
  }

  textChanged(event) {
    const value = event.target.value;
    this.props.onChange(this.props.valueKey, value);
  }

  render() {
    return <FormControl readOnly={this.props.readOnly} type="text" value={this.state.value} onChange={this.textChanged} onBlur={this.textChanged}/>
  }
}

export default class InfosPerso extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { showAddFamily: false, adminView: false, families: [], family: {}, selectedFamily: null, enableSave: false, formValues: {}};

    this.addFamily = this.addFamily.bind(this);
    this.hideAddFamily = this.hideAddFamily.bind(this);
    this.saveData = this.saveData.bind(this);
    this.formValueChanged = this.formValueChanged.bind(this);
    this.loadFamily = this.loadFamily.bind(this);
    this.synchroniseFamily = this.synchroniseFamily.bind(this);
    this.getCAFData = this.getCAFData.bind(this);
    this.setFormValues = this.setFormValues.bind(this);
  }

  componentWillMount() {
    const selectedFamily = auth.familyId();
    const adminView = auth.loggedIn() && auth.admin();

    this.setState({ adminView });

    if (adminView) { 
        // get all families
        fetch("/families", {
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            }
        }).then(checkStatus).then(parseJSON).then((res) => {
            this.setState({ families: res });
            this.loadFamily(null);
        });
    } else { 
        this.loadFamily(selectedFamily);
    }
  }

  setFormValues(data) {
    const formValues = this.state.formValues;
    
    formValues.id = data.id;
    formValues.qf = data.qf;
    formValues.parent1 = data.parents[0];
    formValues.parent2 = data.parents[1];
    formValues.address1 = data.address.street[0];
    formValues.address2 = data.address.street[1];
    formValues.zip = data.address.zip;
    formValues.city = data.address.city;
    
    this.setState({ formValues });
  }

  loadFamily(selectedFamily) {
    const formValues = { parent1: "", parent2: "", address1: "", address2: "", zip: "", city:"", qf: 0, id: 0, email: "", phone_number: "", active: false };

    if (! selectedFamily) {
      this.setState({selectedFamily, formValues});
    } else {
      fetch("/family/"+selectedFamily, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(checkStatus).then(parseJSON).then((res) => {
        this.setFormValues(res);
        this.setState({ selectedFamily, family: { [selectedFamily]: res } });
      });
    }
  }

  formValueChanged(key, value) {
    const formValues = this.state.formValues;
    formValues[key] = value;
    this.setState({ enableSave: true, formValues });
  }

  synchroniseFamily(id) {
    this.getCAFData(id, (data) => {
        this.setFormValues(data);
        this.setState({ enableSave: true, family: { [id]: data } });
    });
  }

  getCAFData(id, cb) {
    fetch('/caf', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
	body: JSON.stringify({ id })
    }).then(checkStatus)
      .then(parseJSON)
      .then((res) => {
        res.id = id;
        cb(res);
    });
  }

  addFamily() {
    const id = ReactDOM.findDOMNode(this.refs.newFamilyId).value;
    const syncCAF = this.newSyncCAF.checked;
    const families = this.state.families;

    this.hideAddFamily();

    if (syncCAF) {
      this.getCAFData(id, (new_family) => {
        families.push(new_family);
        this.setState({ families });
        this.saveData(id, true);
      });
    } else {
      const new_family = { id, children: [] };
      families.push(new_family);
      this.setState({ families });
      this.saveData(id, true);
    }
  }
  
  hideAddFamily() {
    this.setState({ showAddFamily: false });
  }

  saveData(id, load) {
    if (id) {
      const parents = [this.state.formValues.parent1,
                       this.state.formValues.parent2];
      const address = { street: [this.state.formValues.address1,
                                 this.state.formValues.address2],
                        zip: this.state.formValues.zip,
                        city: this.state.formValues.city };
      const qf = this.state.formValues.qf;
      const phone_number = this.state.formValues.phone_number;
      const email = this.state.formValues.email; 
      const children = this.state.family[this.state.selectedFamily].children;

      fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: id, qf, parents, address, email, phone_number, children })
      }).then(checkStatus).then((res) => { if (load) { this.loadFamily(id) }; this.setState({ enableSave: false }) });
    }
  }

  render() {
    const family = this.state.selectedFamily ? this.state.family[this.state.selectedFamily] : { id: null, children: [] };

    const familiesList = (this.state.adminView ? this.state.families.map((f, i) => {
        let p = "";
        try {
            p = " ("+f.parents[0]+")";
        } catch (e) {};
	return (<div><Button bsStyle='link' bsSize="small" onClick={()=>{ this.loadFamily(f.id) } }>
                  {f.id+p}
                </Button>
                <Button pullRight bsSize="xsmall"><Glyphicon glyph="remove"/></Button>
               </div>);
    }) : "");

    return (
      <Grid>
        <Row>
          { this.state.adminView ? (
            <Col lg={4}>
              <Row>
                <Col sm={12}>
                  <Button bsStyle="primary" onClick={() => { this.setState({ showAddFamily: true }) }}>
                    <Glyphicon glyph="plus"/>&nbsp;Ajouter
                  </Button>
                </Col>
              </Row><Row>
                <Col sm={12}>
                  <Panel header="Familles">
                      { familiesList }
                  </Panel>
                </Col>
              </Row>
            </Col> 
          ) : ""}
          <Col lg={8} lgOffset={ this.state.adminView ? 0 : 2}>
            <Row>
              <Col sm={12}>
                <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
                  <Button bsStyle="primary" disabled={!this.state.enableSave || !this.state.selectedFamily} onClick={()=>{this.saveData(family.id)}}>Enregistrer</Button>
                </div>
              </Col>
            </Row>
            <Row>
              <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>N° d'allocataire</Col>
                  <Col sm={4}>
                    <TextInput readOnly={!this.state.adminView} valueObject={this.state.formValues} valueKey="id" onChange={this.formValueChanged}/>
                  </Col>
                  <Col sm={2}>
                    { this.state.adminView ? (
                      <Button bsStyle="primary" disabled={!this.state.selectedFamily} onClick={()=>{this.synchroniseFamily(family.id)}}><Glyphicon glyph="refresh"/>&nbsp;Synchroniser CAF</Button>
                    ) : "" }
                  </Col>
                  <Col sm={2} componentClass={ControlLabel}>QF</Col>
                  <Col sm={2}>
                    <TextInput readOnly={!this.state.adminView} valueObject={this.state.formValues} valueKey="qf" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Parents</Col>
                  <Col sm={10}>
                    <TextInput valueObject={this.state.formValues} valueKey="parent1" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <TextInput valueObject={this.state.formValues} valueKey="parent2" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Adresse</Col>
                  <Col sm={10}>
                    <TextInput valueObject={this.state.formValues} valueKey="address1" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                 <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <TextInput valueObject={this.state.formValues} valueKey="address2" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>CP</Col>
                  <Col sm={3}>
                    <TextInput valueObject={this.state.formValues} valueKey="zip" onChange={this.formValueChanged}/>
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Ville</Col>
                  <Col sm={6}>
                    <TextInput valueObject={this.state.formValues} valueKey="city" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Email</Col>
                  <Col sm={6}>
                    <TextInput valueObject={this.state.formValues} valueKey="email" onChange={this.formValueChanged}/>
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Tel</Col>
                  <Col sm={3}>
                    <TextInput valueObject={this.state.formValues} valueKey="phone_number" onChange={this.formValueChanged}/>
                  </Col>
                </FormGroup>
             </Form>
          </Row>
          <Row>
            <Col sm={12}>
              <h3>Enfants</h3>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              {family.children.map((c, i) => { return <ChildData ref={"child"+i} data={c} readOnly={!this.state.adminView}/> }) }
            </Col>
          </Row>
        </Col>
      </Row>
      <Modal show={this.state.showAddFamily} onHide={this.hideAddFamily}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter famille</Modal.Title>
        </Modal.Header>
        <Modal.Body>
           <Form horizontal>
             <FormGroup>
                <Col sm={4} componentClass={ControlLabel}>N° d'allocataire</Col>
                <Col sm={4}>
                  <FormControl ref="newFamilyId" type="text"/>
                </Col>
                <Col sm={4}>
                  <Checkbox inputRef={(c) => { this.newSyncCAF = c }} defaultChecked>Synchroniser CAF et enregistrer</Checkbox>
                </Col>
            </FormGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="primary" onClick={this.addFamily}>Ajouter</Button>
        </Modal.Footer>
      </Modal>
    </Grid>
    );
  }
}
