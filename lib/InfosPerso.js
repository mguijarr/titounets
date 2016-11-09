import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup } from 'react-bootstrap';
import ChildData from './child.js';
import { getChildren } from './data.js';

export default class InfosPerso extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { activeKey: '1', children: getChildren() };
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(activeKey) {
    this.setState({ activeKey });
  }

  render() {
    return (
      <Grid>
        <Row>
          <Col lg={8} lgOffset={2}>
            <h3>Coordonn&eacute;es</h3>
          </Col>
        </Row>
        <Row>
          <Col lg={8} lgOffset={2}>
              <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Nom</Col>
                  <Col sm={10}>
                    <FormControl type="text" placeholder="Martin" />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Adresse</Col>
                  <Col sm={10}>
                    <FormControl type="text" placeholder="rue des Lilas" />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>CP</Col>
                  <Col sm={3}>
                    <FormControl type="text" placeholder="38500" />
                  </Col>
                  <Col sm={1} componentClass={ControlLabel}>Ville</Col>
                  <Col sm={6}>
                    <FormControl type="text" placeholder="Voiron" />
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
        </Col>
      </Row>
      <Row>
          <Col lg={8} lgOffset={2}>
            <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <Button bsStyle="primary">Enregistrer</Button>
            </div>
          </Col>
      </Row>
      <Row>
        <Col lg={8} lgOffset={2}>
          <h3>Enfants inscrits</h3>
        </Col>
      </Row>
      <Row>
      <Col lg={8} lgOffset={2}>
         {this.state.children.map((c, i) => { return <ChildData child={c}/> }) }
      </Col>
     </Row>
    </Grid>
    );
  }
}
