import React from 'react';
import ReactDOM from 'react-dom';
import { Row, Col, Form, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';

export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

export function parseJSON(response) {
  return response.json()
}

export class TextInput extends React.Component {
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

export class AddressFields extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);

    this.state = { formValues: { address1: "", address2: "", zip: "", city: "", phone_number: "", email: "" }  };

    this.formValueChanged = this.formValueChanged.bind(this);
    this.setFormValues = this.setFormValues.bind(this);
    this.getData = this.getData.bind(this);
  }

  setFormValues(data) {
    const formValues = this.state.formValues;
    
    formValues.address1 = data.address.street[0];
    formValues.address2 = data.address.street[1];
    formValues.zip = data.address.zip;
    formValues.city = data.address.city;
    if (data.phone_number != undefined) {
      formValues.phone_number = data.phone_number;
    }
    if (data.email != undefined) {
      formValues.email = data.email;
    }
  
    this.setState({ formValues });
  }

  formValueChanged(key, value) {
    const formValues = this.state.formValues;
    formValues[key] = value;
    this.setState({ formValues });

    this.props.valueChanged(key, value);
  }

  getData() {
    const address = { street: [this.state.formValues.address1,
                                 this.state.formValues.address2],
                        zip: this.state.formValues.zip,
                        city: this.state.formValues.city };
    const phone_number = this.state.formValues.phone_number;
    const email = this.state.formValues.email; 

    return { address, phone_number, email };
  }

  render() {
    return (
            <Row>
              <Form horizontal>
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
    );
  }
}



