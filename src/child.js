import React from "react";
import ReactDOM from "react-dom";
import {
  Grid,
  Row,
  Col,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Button,
  InputGroup,
  Checkbox,
  Label,
  Glyphicon,
  Panel,
  PanelGroup
} from "react-bootstrap";
import DatePicker from "react-bootstrap-date-picker";
import { TextInput } from "./utils";
import auth from './auth';

export default class ChildData extends React.Component {
  constructor(props) {
    super(props);

    this.dataChanged = this.dataChanged.bind(this);
    this.presentClicked = this.presentClicked.bind(this);
  }

  dataChanged(key, value) {
    this.props.onChange(key, value);
  }

  presentClicked(e) {
    this.props.onChange("present", e.target.checked ? "1" : "0");
  }

  render() {
    return (
      <Form horizontal>
        <FormGroup>
          <Col sm={2} componentClass={ControlLabel}>Nom</Col>
          <Col sm={3}>
            <TextInput
              readOnly={this.props.readOnly}
              valueObject={this.props.data}
              valueKey="surname"
              onChange={this.dataChanged}
            />
          </Col>
          <Col sm={2} componentClass={ControlLabel}>Prénom</Col>
          <Col sm={3}>
               <TextInput
                readOnly={this.props.readOnly}
                valueObject={this.props.data}
                valueKey="name"
                onChange={this.dataChanged}
               />
          </Col>
          <Col sm={2}>
            {auth.admin() ? <div className="pull-right">
              <Button><Glyphicon glyph="remove"/></Button>
            </div> : "" }
          </Col>
        </FormGroup>
        <FormGroup>
          <Col sm={2} componentClass={ControlLabel}>Date de naissance</Col>
          <Col sm={3}>
            <DatePicker
              disabled={this.props.readOnly}
              onChange={d => {
                  this.dataChanged("birthdate", d);
                }}
              monthLabels={
                [
                  "Janvier",
                  "Fevrier",
                  "Mars",
                  "Avril",
                  "Mai",
                  "Juin",
                  "Juillet",
                  "Aout",
                  "Septembre",
                  "Octobre",
                  "Novembre",
                  "Decembre"
                ]
              }
              dayLabels={[ "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" ]}
              dateFormat="DD/MM/YYYY"
              value={this.props.data.birthdate}
            />
          </Col>
          { auth.admin() ? <div>
            <Col sm={2} componentClass={ControlLabel}>Inscrit</Col> 
            <Col sm={1}>
              <Checkbox readOnly={this.props.readOnly} onChange={this.presentClicked} checked={this.props.data.present === '1'}/>
            </Col>
         </div> : "" }
        </FormGroup>
      </Form>
    );
  }
}
