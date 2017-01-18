import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal, Checkbox } from 'react-bootstrap';
import ChildData from './child.js';
import auth from './auth';
import { checkStatus, parseJSON, getFamilyName, AddressFields, TextInput, getAddress } from './utils';

export default class InfosPerso extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { busy: false, showAddFamily: false, adminView: false, addressFields: {}, families: [], family: {}, enableSave: false, formValues: {}, showDelFamily: false };

    this.addFamily = this.addFamily.bind(this);
    this.doAddFamily = this.doAddFamily.bind(this);
    this.delFamily = this.delFamily.bind(this);
    this.hideAddFamily = this.hideAddFamily.bind(this);
    this.hideDelFamily = this.hideDelFamily.bind(this);
    this.saveData = this.saveData.bind(this);
    this.formValueChanged = this.formValueChanged.bind(this);
    this.loadFamily = this.loadFamily.bind(this);
    this.synchroniseFamily = this.synchroniseFamily.bind(this);
    this.getCAFData = this.getCAFData.bind(this);
    this.extractFormValues = this.extractFormValues.bind(this);
    this.addressChanged = this.addressChanged.bind(this);
    this.childChanged = this.childChanged.bind(this);
  }

  componentWillMount() {
    const selectedFamily = auth.familyId();
    const adminView = auth.loggedIn() && auth.admin();

    this.setState({ adminView, busy: true });

    if (adminView) { 
        // get all families
        fetch("/families", {
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
        }).then(checkStatus).then(parseJSON).then((res) => {
            this.setState({ families: res.sort((a,b)=>{
              if (getFamilyName(a) < getFamilyName(b)) { return -1 } else { return 1 };
            })});
            this.loadFamily(null);
        });
    } else { 
        this.loadFamily(selectedFamily);
    }
  }

  extractFormValues(data) {
    const addressFields = { address1: data.address.street[0], address2: data.address.street[1], zip: data.address.zip, city: data.address.city, phone_number: data.phone_number, email: data.email };
    const formValues = { parent1: data.parents[0], parent2: data.parents[1], qf: data.qf };
    return {addressFields, formValues};
  }

  loadFamily(selectedFamily, stateDict) {
    if (stateDict === undefined) { stateDict = {} };

    if (! selectedFamily) {
      const family = { id: null, children: [] };
      this.setState({busy: false, family, formValues: { parent1: "", parent2: "", qf: 0 }, addressFields:{}, ...stateDict });
    } else {
      this.setState({busy: true});
      fetch("/family/"+selectedFamily, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).then(checkStatus).then(parseJSON).then((res) => {
        const families = this.state.families;
        for (let i=0; i<families.length; i++) {
          if (families[i].id == selectedFamily) {
            families[i] = res;
            break;
          }
        }

        this.setState({ busy: false, families, family: res, enableSave: false, ...this.extractFormValues(res), ...stateDict });
      });
    }
  }

  formValueChanged(key, value) {
    const formValues = this.state.formValues;
    formValues[key] = value;
    this.setState({ enableSave: true, formValues });
  }

  addressChanged(key, value) {
    const addressFields = this.state.addressFields;
    addressFields[key] = value;

    this.setState({ enableSave: true, addressFields });
  }

  childChanged(child_i, key, value) {
    const family = this.state.family;
    family.children[child_i][key] = value;
    this.setState({ enableSave: true, family }); 
  }

  synchroniseFamily(id) {
    this.setState({busy: true});
    this.getCAFData(id, (data) => {
        this.setState({ busy: false, enableSave: true, family: data, ...this.extractFormValues(data) });
    });
  }

  getCAFData(id, cb) {
    fetch('/caf', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
        credentials: 'include',
	body: JSON.stringify({ id })
    }).then(checkStatus)
      .then(parseJSON)
      .then((res) => {
        res.id = id;
        cb(res);
    });
  }

  doAddFamily(new_family) {
      const families = this.state.families;
      families.push(new_family);
      this.setState({ families: families.sort((a,b)=>{
          if (getFamilyName(a) < getFamilyName(b)) { return -1 } else { return 1 }; 
        }), 
        family: new_family, ...this.extractFormValues(new_family) });
      this.saveData(new_family.id);
  }

  addFamily() {
    const id = ReactDOM.findDOMNode(this.refs.newFamilyId).value;
    const syncCAF = this.newSyncCAF.checked;

    this.hideAddFamily();

    if (syncCAF) {
      this.getCAFData(id, this.doAddFamily);
    } else {
      this.doAddFamily({ id, parents: ["",""], address: { street: ["",""], zip: "", city: "" }, phone_number: "", email: "", qf: 0, children: [] });
    }
  }
  
  hideAddFamily() {
    this.setState({ showAddFamily: false });
  }

  delFamily() {
    const id = this.state.family.id; 

    fetch('/delfamily', {
      method: 'POST',
      headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username: id })
      }).then(checkStatus)
        .then(parseJSON).then((res) => {
            this.setState({ families: res, showDelFamily: false });
            this.loadFamily(null);
    });
  }

  hideDelFamily() {
    this.setState({ showDelFamily: false });
  }

  saveData(id) {
    if (id) {
      const parents = [this.state.formValues.parent1,
                       this.state.formValues.parent2];
      const qf = this.state.formValues.qf;
      const children = this.state.family.children;
 
      fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username: id, qf, parents, children, ...getAddress(this.state.addressFields)})
      }).then(checkStatus).then((res) => {
          const data = { id, qf, parents, children, ...getAddress(this.state.addressFields) };

          const families = this.state.families;

          for (let i=0; i<families.length; i++) {
            if (families[i].id == id) {
              families[i] = data;
              break;
            }
          }

          this.setState({ families, family: data, enableSave: false });
      });
    }
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="spinner.gif"/>
    }

    const family = Object.assign({id: null, children: [] }, this.state.family);

    const familiesList = (this.state.adminView ? this.state.families.map((f, i) => {
	return (<div><Button bsStyle='link' bsSize="small" onClick={()=>{ this.loadFamily(f.id) } }>
                  {getFamilyName(f) + ' ('+f.id+')'}
                </Button>
                <Button pullRight bsSize="xsmall" onClick={()=>{ this.loadFamily(f.id, { showDelFamily: true }) }}><Glyphicon glyph="remove"/></Button>
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
                  <Button bsStyle="primary" disabled={!this.state.enableSave || !family.id} onClick={()=>{this.saveData(family.id)}}>Enregistrer</Button>
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
                      <Button bsStyle="primary" disabled={!family.id} onClick={()=>{this.synchroniseFamily(family.id)}}><Glyphicon glyph="refresh"/>&nbsp;Synchroniser CAF</Button>
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
             </Form>
          </Row>
          <AddressFields valueChanged={this.addressChanged} formValues={this.state.addressFields}/>
          <Row>
            <Col sm={12}>
              <h3>Enfants</h3>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              {family.children.map((c, i) => { return <ChildData data={c} readOnly={!this.state.adminView} onChange={(k,v)=>{this.childChanged(i, k, v)}}/> }) }
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
                  <Checkbox inputRef={(c) => { this.newSyncCAF = c }} defaultChecked>Synchroniser CAF</Checkbox>
                </Col>
            </FormGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="primary" onClick={this.addFamily}>Ajouter</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={this.state.showDelFamily} onHide={this.hideDelFamily}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation de suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>
           Etes-vous sûr de supprimer la famille ?
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="danger" onClick={this.delFamily}>Supprimer</Button>
          <Button onClick={this.hideDelFamily}>Annuler</Button>
        </Modal.Footer>
      </Modal>
    </Grid>
    );
  }
}
