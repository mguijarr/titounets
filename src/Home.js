import React from "react";
import { EditorState, ContentState }  from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import {
  checkStatus,
  parseJSON,
} from "./utils";

export default class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    const content = ContentState.createFromText("");
    this.state = { editorState: EditorState.createWithContent(content) };
    this.onChange = (editorState) => {
      this.setState({ editorState });
    };
  }

  componentDidMount() {
  }

  uploadCallback(file) {
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: fd
    }).then(checkStatus).then(parseJSON).then(res => {
      return { data: { link: res } };
    });
  }

  render() {
    const { editorState } = this.state;

    return (
      <div style={{ marginLeft: '2em', marginRight: '2em' }}>
        <Editor editorState={editorState}
                onEditorStateChange={this.onChange}
                toolbar={{ image: { uploadCallback: this.uploadCallback }}}
                placeholder="Créez votre page d'accueil ici"
        />
      </div>
    );
  }
}
