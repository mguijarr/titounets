import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup } from 'react-bootstrap';
import DatePicker from 'react-bootstrap-date-picker';

export default class ChildData extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = { readOnly: true };
    this.edit = this.edit.bind(this);
    this.save = this.save.bind(this);
  }

  edit() {
      this.setState({readOnly: false });
   }
 
  save() {
      const name = ReactDOM.findDOMNode(this.refs.childName).value;
      const surname = ReactDOM.findDOMNode(this.refs.childSurname).value;
      const birthday = ReactDOM.findDOMNode(this.refs.birthdate).value;
      this.setState({readOnly: true });
  }
 
  render() {
        return <Form horizontal>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Nom</Col>
               <Col sm={4}>
                 <FormControl readOnly={this.state.readOnly} type="text" ref='childSurname' placeholder="Martin" value={this.props.child.surname}/>
               </Col>
               <Col sm={2} componentClass={ControlLabel}>Pr&eacute;nom</Col>
               <Col sm={4}>
                 <FormControl readOnly={this.state.readOnly} type="text" ref='childName' placeholder="Lea" value={this.props.child.name}/>
               </Col>
             </FormGroup>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Date de naissance</Col>
               <Col sm={10}>
                 <DatePicker disabled={this.state.readOnly} ref='birthdate' 
                   monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                   dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']} dateFormat="DD/MM/YYYY" value={this.props.child.birthdate}
                 />
               </Col>
             </FormGroup>
             <FormGroup>
               <Col sm={12}>
                 <div className="pull-right" style={{marginRight: '5px'}}>
                 { this.state.readOnly ?
                   <Button bsStyle='primary' onClick={this.edit}><Glyphicon glyph="pencil"/>{' Editer'}</Button>
                 :
                  <Button bsStyle='info' onClick={this.save}><Glyphicon glyph="floppy-disk"/>{' Enregistrer'}</Button>  
                 }
                 </div>
               </Col>
             </FormGroup>
             
           </Form>
    }
}
    
