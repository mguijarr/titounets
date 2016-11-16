import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup } from 'react-bootstrap';
import DatePicker from 'react-bootstrap-date-picker';

export default class ChildData extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = { readOnly: true };
    this.getData = this.getData.bind(this);
  }

  getData() {
      const name = ReactDOM.findDOMNode(this.refs.childName).value;
      const surname = ReactDOM.findDOMNode(this.refs.childSurname).value;
      const birthday = ReactDOM.findDOMNode(this.refs.birthdate).value;
      return {name, surname, birthday}
  }
 
  render() {
        return <Form horizontal>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Nom</Col>
               <Col sm={4}>
                 <FormControl readOnly={this.state.readOnly} type="text" ref='childSurname' placeholder="Martin" value={this.props.data.surname}/>
               </Col>
               <Col sm={2} componentClass={ControlLabel}>Pr&eacute;nom</Col>
               <Col sm={4}>
                 <FormControl readOnly={this.state.readOnly} type="text" ref='childName' placeholder="Lea" value={this.props.data.name}/>
               </Col>
             </FormGroup>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Date de naissance</Col>
               <Col sm={10}>
                 <DatePicker disabled={this.state.readOnly} ref='birthdate' 
                   monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                   dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']} dateFormat="DD/MM/YYYY" value={this.props.data.birthdate}
                 />
               </Col>
             </FormGroup>
             <FormGroup>
               <Col sm={12}>
                 <div className="pull-right">
                 </div>
               </Col>
             </FormGroup>
             
           </Form>
    }
}
    
