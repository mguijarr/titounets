import { checkStatus, parseJSON } from "./utils";

export default {
  login(et, user, pass, cb) {
    if (localStorage.loggedIn) {
      if (cb) {
        cb(true);
      }
      this.onChange(true);
      return;
    }

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ et, username: user, password: pass })
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        if (res.success) {
          localStorage.loggedIn = true;
          localStorage.admin = res.admin;
          localStorage.et = et;
          if (res.admin) {
            localStorage.familyId = null;
          } else {
            localStorage.familyId = user;
          }
          if (cb) {
            cb(true);
          }
          this.onChange(true);
        } else {
          localStorage.clear();
          if (cb) {
            cb(false);
          }
          this.onChange(false);
        }
      })
      .catch(error => {
        console.log("request failed");
        this.onChange(false);
      });
  },
  logout(cb) {
    localStorage.clear();
    fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(() => {
      if (cb) {
        cb(false);
      }
      this.onChange(false);
    });
  },
  loggedIn() {
    return localStorage.loggedIn === "true";
  },
  admin() {
    return localStorage.admin === "true";
  },
  familyId() {
    return localStorage.familyId;
  },
  onChange() {
  }
}
