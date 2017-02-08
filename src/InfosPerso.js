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
  Label,
  Glyphicon,
  Panel,
  PanelGroup,
  Modal,
  Checkbox
} from "react-bootstrap";
import ChildData from "./child.js";
import auth from "./auth";
import {
  checkStatus,
  parseJSON,
  getFamilyName,
  AddressFields,
  TextInput,
  getAddress
} from "./utils";

export default class InfosPerso extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      addressFields: {},
      enableSave: false,
      formValues: {}
    };

    this.saveData = this.saveData.bind(this);
    this.formValueChanged = this.formValueChanged.bind(this);
    this.extractFormValues = this.extractFormValues.bind(this);
    this.addressChanged = this.addressChanged.bind(this);
    this.childChanged = this.childChanged.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const save = (Object.keys(nextProps.family).length > 0) && (nextProps.family.id !== this.props.family.id);
    const enableSave = (! save) && (JSON.stringify(this.props.family)!==JSON.stringify(nextProps.family))
    this.setState({ ...this.extractFormValues(nextProps.family), enableSave }, ()=>{ if (save) { this.saveData(nextProps.family) } });
  }

  extractFormValues(data) {
    if (Object.keys(data).length === 0) { return { addressFields: { address1: "", address2: "", zip: "", city: "", phone_number: "", email: "" },
                                  formValues: { parent1: "", parent2: "", qf: "", id: "" } }
    }

    const addressFields = {
      address1: data.address.street[0],
      address2: data.address.street[1],
      zip: data.address.zip,
      city: data.address.city,
      phone_number: data.phone_number,
      email: data.email
    };
    const formValues = {
      parent1: data.parents[0],
      parent2: data.parents[1],
      qf: data.qf,
      id: data.id
    };
    return { addressFields, formValues };
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
    const family = this.props.family;
    family.children[child_i][key] = value;
    this.setState({ enableSave: true, family });
  }

  saveData(family) {
    const parents = [
      this.state.formValues.parent1,
      this.state.formValues.parent2
    ];
    const qf = this.state.formValues.qf;
    const id = family.id;
    const children = family.children;
    const till = family.till;

    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: id,
        till,
        qf,
        parents,
        children,
        ...getAddress(this.state.addressFields)
      })
    })
    .then(checkStatus).then(()=>{
      this.setState({ enableSave: false });

      family = Object.assign({}, family, { parents, qf, ...getAddress(this.state.addressFields) });

      this.props.updateFamily(family);
    });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    const family = Object.assign({ id: null, children: [] }, this.props.family);

    return (<div>
            <Row>
              <Col sm={12}>
                <div
                  className="pull-right"
                  style={{ marginTop: "15px", marginBottom: "15px" }}
                >
                  <Button
                    bsStyle="primary"
                    disabled={!this.state.enableSave || !family.id}
                    onClick={() => {
                        this.saveData(family);
                      }}
                  >Enregistrer</Button>
                </div>
              </Col>
            </Row>
            <Row>
              <Form horizontal>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>
                    N° d'allocataire
                  </Col>
                  <Col sm={4}>
                    <TextInput
                      readOnly={!auth.admin()}
                      valueObject={this.state.formValues}
                      valueKey="id"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                  <Col sm={2} componentClass={ControlLabel}>QF</Col>
                  <Col sm={2}>
                    <TextInput
                      readOnly={!auth.admin()}
                      valueObject={this.state.formValues}
                      valueKey="qf"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>Parents</Col>
                  <Col sm={10}>
                    <TextInput
                      valueObject={this.state.formValues}
                      valueKey="parent1"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col sm={2} componentClass={ControlLabel}>{" "}</Col>
                  <Col sm={10}>
                    <TextInput
                      valueObject={this.state.formValues}
                      valueKey="parent2"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
              </Form>
            </Row>
            <AddressFields
              valueChanged={this.addressChanged}
              formValues={this.state.addressFields}
            />
            <Row>
              <Col sm={12}>
                <h3>Enfants</h3>
              </Col>
            </Row>
            <Row>
              <Col sm={12}>
                {family.children.map((c, i) => {
                    return (
                      <ChildData
                        data={c}
                        readOnly={!auth.admin()}
                        onChange={(k, v) => {
                            this.childChanged(i, k, v);
                          }}
                      />
                    );
                  })}
              </Col>
            </Row>
      </div>
    );
  }
}
