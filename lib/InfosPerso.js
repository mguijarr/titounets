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

export default class InfosPerso extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { showAddFamily: false, adminView: false, families: [], family: {}, selectedFamily: null, children: [] };

    this.addFamily = this.addFamily.bind(this);
    this.hideAddFamily = this.hideAddFamily.bind(this);
    this.saveData = this.saveData.bind(this);
  }

  componentWillMount() {
    const selectedFamily = auth.familyId();
    const adminView = auth.loggedIn() && auth.admin();

    if (adminView) { 
        // get all families
        fetch("/families", {
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            }
        }).then(checkStatus).then(parseJSON).then((res) => {
            const family = {};
            res.map((f, i) => { family[f.id] = f });
            this.setState({ adminView, families: res, family });
        });
    } else { 
      // get one family
      fetch("/family/"+selectedFamily, {
          method: "GET",
          headers: {
            'Content-Type': 'application/json'
          }
      }).then(checkStatus).then(parseJSON).then((res) => {
          this.setState({ adminView, selectedFamily, family: { [selectedFamily]: res }, families: [res] });
      });
    }
  }

  addFamily() {
    const id = ReactDOM.findDOMNode(this.refs.newFamilyId).value;
    const syncCAF = this.newSyncCAF.checked;

    this.hideAddFamily();

    if (syncCAF) {
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
	
            const families = this.state.families;
            const family = this.state.family;
            families.push(res);
            family[id] = res;

            this.setState({ families, family, selectedFamily: id });
 
            this.saveData();
	}).catch((error) => {
	    console.log('request failed', error)
	})
    } else {
      const families = this.state.families;
      const family = this.state.family;
      const new_family = { id, children: [] };
      families.push(new_family);
      family[id] = new_family;

      this.setState({ families, family, selectedFamily: id });      
    }
  }
  
  hideAddFamily() {
    this.setState({ showAddFamily: false });
  }

  saveData() {
    if (this.state.selectedFamily) {
      const parents = [ReactDOM.findDOMNode(this.refs.parent1).value,
                       ReactDOM.findDOMNode(this.refs.parent2).value];
      const address = { street: [ReactDOM.findDOMNode(this.refs.address1).value,
                                 ReactDOM.findDOMNode(this.refs.address2).value],
                        zip: ReactDOM.findDOMNode(this.refs.zip).value,
                        city: ReactDOM.findDOMNode(this.refs.city).value };
      const qf = ReactDOM.findDOMNode(this.refs.qf).value;
      const phone_number = ReactDOM.findDOMNode(this.refs.phone_number).value;
      const email = ReactDOM.findDOMNode(this.refs.email).value; 
      const children = this.state.family[this.state.selectedFamily].children;

      fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: this.state.selectedFamily, qf, parents, address, email, phone_number, children })
      }).then(checkStatus).then((res) => { });
    }
  }

  render() {
    const family = this.state.selectedFamily ? this.state.family[this.state.selectedFamily] : { children: [] };

    let parent1 = "";
    let parent2 = "";
    let address1 = "";
    let address2 = "";
    let zip = "";
    let city = "";
    let active = false;
    let qf = 0;
    let id = 0;
    let email = "";
    let phone_number = "";
    try {
      id = family.id;
      qf = family.qf;
      parent1 = family.parents[0];
      parent2 = family.parents[1];
      address1 = family.address.street[0];
      address2 = family.address.street[1];
      zip = family.address.zip;
      city = family.address.city;
      email = family.email;
      phone_number = family.phone_number;
      active = family.active;
    } catch (e) { } 

    const familiesList = (this.state.adminView ? this.state.families.map((f, i) => {
        let p = "";
        try {
            p = " ("+f.parents[0]+")";
        } catch (e) {};
	return (<span><Button bsStyle='link' bsSize="small" onClick={()=>{ this.setState({selectedFamily: f.id})} }>
                  {f.id+p}
                </Button>
                <Button pullRight bsSize="xsmall"><Glyphicon glyph="remove"/></Button>
               </span>);
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
                <h3>Famille</h3>
              </Col>
            </Row>
            <Row>
              <Col sm={12}>
                { this.state.adminView ? (
                <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
                  <Button bsStyle={family.active ? "success" : "warning"} disabled={!this.state.selectedFamily}>{family.active ? "OK" : "Activer"}</Button>
                </div>
                ) : ""}
              </Col>
            </Row>
            <Row>
              <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>N° d'allocataire</Col>
                  <Col sm={4}>
                    <FormControl readOnly={!this.state.adminView} ref="familyId" type="text" value={id}/>
                  </Col>
                  <Col sm={2}>
                    { this.state.adminView ? (
                      <Button bsStyle="primary" disabled={!this.state.selectedFamily}><Glyphicon glyph="refresh"/>&nbsp;Synchroniser CAF</Button>
                    ) : "" }
                  </Col>
                  <Col sm={2} componentClass={ControlLabel}>QF</Col>
                  <Col sm={2}>
                    <FormControl readOnly={!this.state.adminView} type="text" ref="qf" value={qf}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Parents</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={parent1} ref="parent1"/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={parent2} ref="parent2"/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Adresse</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={address1} ref="address1"/>
                  </Col>
                </FormGroup>
                 <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={address2} ref="address2"/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>CP</Col>
                  <Col sm={3}>
                    <FormControl type="text" value={zip} ref="zip"/>
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Ville</Col>
                  <Col sm={6}>
                    <FormControl type="text" value={city} ref="city"/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Email</Col>
                  <Col sm={6}>
                    <FormControl type="email" ref="email" value={email}/>
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Tel</Col>
                  <Col sm={3}>
                    <FormControl type="text" ref="phone_number" value={phone_number}/>
                  </Col>
                </FormGroup>
             </Form>
          </Row>
          <Row>
            <Col sm={12}>
              <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
                <Button bsStyle="primary" disabled={!this.state.selectedFamily} onClick={this.saveData}>Enregistrer</Button>
              </div>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <h3>Enfants</h3>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              {family.children.map((c, i) => { return <ChildData ref={"child"+i} data={c}/> }) }
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
