import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, Label, Glyphicon, Panel, PanelGroup } from 'react-bootstrap';
import DatePicker from 'react-bootstrap-date-picker';
import { TextInput } from './utils';

export default class ChildData extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = { readOnly: false, data: {} };
    this.dataChanged = this.dataChanged.bind(this);
  }

  componentWillMount() {
    const data = { name: this.props.data.name, surname: this.props.data.surname, birthdate: this.props.data.birthdate };
    this.setState({data});
  }

  dataChanged(key, value) {
      const data = this.state.data;
      data[key] = value;
      this.setState({data});
      this.props.onChange(key, value);
  }

  render() {
        return <Form horizontal>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Nom</Col>
               <Col sm={4}>
                 <TextInput readOnly={this.props.readOnly} valueObject={this.state.data} valueKey='surname' onChange={this.dataChanged}/>
               </Col>
               <Col sm={2} componentClass={ControlLabel}>Pr&eacute;nom</Col>
               <Col sm={4}>
                 <TextInput readOnly={this.props.readOnly} valueObject={this.state.data} valueKey='name' onChange={this.dataChanged}/>
               </Col>
             </FormGroup>
             <FormGroup> 
               <Col sm={2} componentClass={ControlLabel}>Date de naissance</Col>
               <Col sm={10}>
                 <DatePicker disabled={this.props.readOnly} onChange={(d)=>{this.dataChanged('birthdate', d)}}
                   monthLabels={['Janvier','Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']}
                   dayLabels={['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']} dateFormat="DD/MM/YYYY" value={this.state.data.birthdate}
                 />
               </Col>
             </FormGroup>
           </Form>
    }
}
    
