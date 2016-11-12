import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup, Modal } from 'react-bootstrap';
import ChildData from './child.js';
import auth from './auth.js';
import data from './data.js';
import 'whatwg-fetch';

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
  }

  componentWillMount() {
    this.setState({ adminView: auth.loggedIn() && auth.admin(),
                    selectedFamily: auth.familyId(),
                    families: data.families,
                    family: data.family });
  }

  addFamily() {
    const id = ReactDOM.findDOMNode(this.refs.newId).value;

    this.hideAddFamily();

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
	
            data.addFamily(res);

            this.setState({ families: data.families, family: data.family, selectedFamily: id });
	}).catch((error) => {
	    console.log('request failed', error)
	})
  }
  
  hideAddFamily() {
    this.setState({ showAddFamily: false });
  }

  render() {
    const family = this.state.selectedFamily ? data.family[this.state.selectedFamily] : { children: [] };
    let parent1 = "";
    let parent2 = "";
    let address1 = "";
    let address2 = "";
    let cp = "";
    let city = "";
    try {
      parent1 = family.parents[0];
      parent2 = family.parents[1];
      address1 = family.address1;
      address2 = family.address2;
      cp = family.cp;
      city = family.city;
    } catch (e) { } 

    const familiesList = (this.state.families.map((f, i) => { 
	return (<span><Button bsStyle='link' bsSize="small" onClick={()=>{ this.setState({selectedFamily: f.id})} }>
                  {f.id+" ("+f.parents[0]+")"}
                </Button>
                <Button pullRight bsSize="xsmall"><Glyphicon glyph="remove"/></Button>
               </span>);
    }));

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
              <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>N° d'allocataire</Col>
                  <Col sm={4}>
                    <FormControl readOnly={!this.state.adminView} type="text" value={family.id}/>
                  </Col>
                  <Col sm={2}>
                    { this.state.adminView ? (
                      <Button bsStyle="primary"><Glyphicon glyph="refresh"/>&nbsp;Synchroniser CAF</Button>
                    ) : "" }
                  </Col>
                  <Col sm={2} componentClass={ControlLabel}>QF</Col>
                  <Col sm={2}>
                    <FormControl readOnly={!this.state.adminView} type="text" value={family.qf}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Parents</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={parent1} />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <FormControl type="text" value={parent2} />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Adresse</Col>
                  <Col sm={10}>
                    <FormControl type="text" placeholder="rue des Lilas" value={address1} />
                  </Col>
                </FormGroup>
                 <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{' '}</Col>
                  <Col sm={10}>
                    <FormControl type="text" placeholder="" value={address2} />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>CP</Col>
                  <Col sm={3}>
                    <FormControl type="text" placeholder="38500" value={cp}/>
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Ville</Col>
                  <Col sm={6}>
                    <FormControl type="text" placeholder="Voiron" value={city}/>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Email</Col>
                  <Col sm={6}>
                    <FormControl type="email" placeholder="martin@free.fr" />
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Tel</Col>
                  <Col sm={3}>
                    <FormControl type="text" placeholder="0664209351" />
                  </Col>
                </FormGroup>
             </Form>
          </Row>
          <Row>
            <Col sm={12}>
              <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
                <Button bsStyle="primary">Enregistrer</Button>
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
              {family.children.map((c, i) => { return <ChildData child={c}/> }) }
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
                <Col sm={8}>
                  <FormControl ref="newId" type="text"/>
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
