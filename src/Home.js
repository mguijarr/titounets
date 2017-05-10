import React from "react";
import { Grid, Row, Col, Button, Glyphicon } from 'react-bootstrap';
import { EditorState, ContentState, convertToRaw, convertFromRaw }  from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import {
  checkStatus,
  parseJSON,
} from "./utils";
import auth from "./auth";

export default class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    const content = ContentState.createFromText("");
    this.state = { editorState: EditorState.createWithContent(content), changed: false };
    this.onChange = (editorState) => {
      this.setState({ editorState, changed: true });
    };
    this.save = this.save.bind(this);
  }

  componentDidMount() {
    fetch("/api/editorContents", {
      method: "GET",
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      if (Object.keys(res).length > 0) {
        const content = convertFromRaw(res);
        this.setState({ editorState: EditorState.createWithContent(content), changed: false }); 
      }
    });
  }

  uploadCallback(file) {
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/file", {
      method: "POST",
      credentials: "include",
      body: fd
    }).then(checkStatus).then(parseJSON).then(res => {
      return { data: res };
    });
  }

  save() {
    const data = convertToRaw(this.state.editorState.getCurrentContent());
 
    fetch("/api/editorContents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(checkStatus).then(() => {  
      this.setState({ changed: false });
    });
  }

  render() {
    const { editorState } = this.state;

    return (
      <Grid>
        { auth.admin() ? <Row>
          <Col xs={12}>
            <Button bsStyle="primary" className="pull-right" disabled={!this.state.changed} onClick={this.save}>
              <Glyphicon glyph="save"/>Enregistrer
            </Button>
          </Col>
        </Row> : null }
        <Row style={{ paddingTop: '10px' }}>
          <Col xs={12}>
            <Editor editorState={editorState}
                  onEditorStateChange={this.onChange}
                  toolbar={{options: ["inline", "blockType", "fontSize", "fontFamily", "list", "textAlign", "colorPicker", "link", "image", "history"], image: { uploadCallback: this.uploadCallback }}}
                  placeholder="Créez votre page d'accueil ici"
                  readOnly={ auth.admin() ? false : true }
                  locale="fr"
                  toolbarHidden={ auth.admin() ? false : true }
            />
          </Col>
        </Row>
      </Grid>
    );
  }
}
