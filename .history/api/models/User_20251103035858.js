const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    constructor(data) {
        this.id = data.id;
        this.name = data.name || data.display_name;
        this.display_name = data.display_name || data.name;
        this.email = data.email;
        this.avatar_url = data.avatar_url;
        this.password_hash = data.password_hash; // Never expose this in responses
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Hash password
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password) {
        if (!this.password_hash) return false;
        return await bcrypt.compare(password, this.password_hash);
    }

    // Get user data without sensitive information
    toJSON() {
        const { password_hash, ...user } = this;
        return user;
    }

    // Get all users with pagination
    static async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const result = await query(
            'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]
        );
        return result.rows.map(row => new User(row));
    }

    // Get user by ID
    static async findById(id) {
        const result = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return new User(result.rows[0]);
    }

    // Get user by email (for login - includes password)
    static async findByEmail(email, includePassword = false) {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return null;
        const user = new User(result.rows[0]);
        return user;
    }

    // Create new user
    static async create(userData) {
        const { name, email, avatar_url, password } = userData;
        let password_hash = null;

        // Hash password if provided
        if (password) {
            password_hash = await User.hashPassword(password);
        }

        // Use display_name if provided, otherwise use name
        const display_name = userData.display_name || name;

        const result = await query(
            'INSERT INTO users (email, display_name, avatar_url, password_hash) VALUES ($1, $2, $3, $4) RETURNING *', [email, display_name, avatar_url, password_hash]
        );
        return new User(result.rows[0]);
    }

    // Update user
    async update(updateData) {
        const { name, display_name, email, avatar_url, password } = updateData;

        // Hash password if provided
        let password_hash = this.password_hash;
        if (password) {
            password_hash = await User.hashPassword(password);
        }

        // Use display_name if provided, otherwise use name
        const final_display_name = display_name || name || this.display_name;

        const result = await query(
            'UPDATE users SET display_name = $1, email = $2, avatar_url = $3, password_hash = $4 WHERE id = $5 RETURNING *', [final_display_name, email || this.email, avatar_url || this.avatar_url, password_hash, this.id]
        );
        if (result.rows.length === 0) return null;
        return new User(result.rows[0]);
    }

    // Delete user
    async delete() {
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [this.id]);
        return result.rows.length > 0;
    }

    // Get user's posts
    async getPosts(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const result = await query(
            'SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [this.id, limit, offset]
        );
        return result.rows;
    }

    // Get total count of users
    static async count() {
        const result = await query('SELECT COUNT(*) FROM users');
        return parseInt(result.rows[0].count);
    }

    // Search users by name or email
    static async search(searchTerm, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const result = await query(
            'SELECT * FROM users WHERE display_name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [`%${searchTerm}%`, limit, offset]
        );
        return result.rows.map(row => new User(row));
    }
}

module.exports = User;