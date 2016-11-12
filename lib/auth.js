module.exports = {
  login(user, pass, cb) {
    if (localStorage.token) {
      if (cb) cb(true);
      this.onChange(true);
      return;
    }
    pretendRequest(user, pass, (res) => {
      if (res.authenticated) {
        localStorage.token = res.token;
        localStorage.admin = res.admin;
        localStorage.id = res.id;
        if (cb) cb(true);
        this.onChange(true);
      } else {
        localStorage.admin = false;
        localStorage.id = "";
        if (cb) cb(false);
        this.onChange(false);
      }
    });
  },

  getToken() {
    return localStorage.token;
  },

  logout(cb) {
    delete localStorage.token;
    delete localStorage.admin;
    if (cb) cb();
    this.onChange(false);
  },

  loggedIn() {
    return !!localStorage.token;
  },

  admin() {
    return localStorage.admin === "true";
  },

  familyId() {
    return localStorage.id;
  },

  onChange() {},
};

function pretendRequest(username, password, cb) {
  setTimeout(() => {
    if (username === 'admin' && password === 'admin') {
      cb({
        authenticated: true,
        admin: true,
        id: "",
        token: Math.random().toString(36).substring(7),
      });
    } else {
      if (username === 'guijarro' && password === 'almeria') {
        cb({
          authenticated: true,
          admin: false,
          id: "1137640",
          token: Math.random().toString(36).substring(7),
        });
      } else {
        cb({ authenticated: false, admin: false });
      }
    }
  }, 0);
}
