import React from "react";
import Moment from "moment";
import { extendMoment } from "moment-range";
import {
  Grid,
  Row,
  Col,
  Overlay,
  Popover,
  Button,
  ButtonToolbar,
  Checkbox,
  Label,
  Glyphicon,
  Panel,
  Modal,
  DropdownButton,
  MenuItem,
  Table,
  FormGroup,
  ControlLabel,
  FormControl,
  Form
} from "react-bootstrap";
import auth from "./auth";
import {
  isClosed,
  isHoliday,
  checkStatus,
  parseJSON,
  findDays,
  formatHour,
  DatePicker,
  downloadBill
} from "./utils";
import Contract from "./contrat";
import spinner from "./img/spinner.gif";

const moment = extendMoment(Moment);

export default class FacturesParents extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = {
      busy: true,
      bills: [],
    };

    this.getData = this.getData.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.family.id !== nextProps.family.id) {
      this.getData(nextProps.family.id);
    }
  }

  componentWillMount() {
    this.getData(this.props.family.id);
  }

  getData(familyId) {
    this.setState({ busy: true });

    //@app.route("/api/bills/<username>/list", methods=["GET"])
    fetch("/api/bills/" + familyId + "/list", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(bills => {
      this.setState({ busy: false, bills });
    })
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src={spinner} />
    }

    return (
      <Grid>
        <p></p>
        <Form horizontal>
          {this.state.bills.map(yearBills=>
            {yearBills.months.map(bill=>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>
                  {bill.month + ' ' + yearBills.year + ':'}
              </Col>
              <Col sm={2}>
                {bill.amount}
              </Col>
              <Col sm={4}>
                <ButtonToolbar className="pull-right">
                  <Button>Imprimer</Button>
                  <Button bsStyle={bill.paid ? "success" : "primary" }>{bill.paid ? "Acquitée" : "Payer"}</Button>
                </ButtonToolbar>
              </Col>
            </FormGroup>
          )})}
        </Form>
        <hr />
      </Grid>
    );
  }
}
