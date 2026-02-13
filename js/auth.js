/**
 * Auth.js
 * Handles user login/logout and session management.
 */
class Auth {
    constructor(store) {
        this.store = store;
        this.currentUser = null;
    }

    login(username, password) {
        const users = this.store.getData().users;
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            this.currentUser = user;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            this.store.logAudit(user.username, 'Login', 'User logged in successfully.');
            return { success: true, user };
        } else {
            this.store.logAudit('System', 'Login Failed', `Failed login attempt for ${username}`);
            return { success: false, message: 'Invalid credentials' };
        }
    }

    register(username, password, role) {
        const users = this.store.getData().users;
        if (users.find(u => u.username === username)) {
            return { success: false, message: 'Username already exists' };
        }

        const newUser = {
            id: 'u' + Date.now(),
            username,
            password,
            role
        };

        this.store.addUser(newUser);
        return { success: true, message: 'Registration successful' };
    }

    logout() {
        if (this.currentUser) {
            this.store.logAudit(this.currentUser.username, 'Logout', 'User logged out.');
            this.currentUser = null;
            sessionStorage.removeItem('currentUser');
        }
    }

    checkSession() {
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
            return this.currentUser;
        }
        return null;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }
}

// Global instance
window.Auth = new Auth(window.Store);
