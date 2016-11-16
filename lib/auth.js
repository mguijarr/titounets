import 'isomorphic-fetch';

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText)
    error.response = response;
    throw error;
  }
}

function parseJSON(response) {
  return response.json()
}

export default {
  login(user, pass, cb) {
    if (localStorage.loggedIn) {
      if (cb) cb(true);
      this.onChange(true);
      return;
    }

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: user, password: pass })
    }).then(checkStatus)
        .then(parseJSON)
        .then((res) => {
            if (res.success) {
                localStorage.loggedIn = true;
                localStorage.admin = res.admin;
                if (res.admin) {
                    localStorage.familyId = "";
                } else {
                    localStorage.familyId = res.id;
                }
                if (cb) cb(true);
                this.onChange(true);
            } else {
                localStorage.clear();
                if (cb) cb(false);
                this.onChange(false);
            }
        }).catch((error) => {
            console.log('request failed', error)
        })
  },

  logout(cb) {
    localStorage.clear();
    if (cb) cb();
    this.onChange(false);
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

  onChange() {}
};

