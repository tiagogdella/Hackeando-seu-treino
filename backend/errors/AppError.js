export class AppError extends Error {
    /**
     * @param {string} message
     * @param {number} status
     */
    constructor(message, status) {
        super(message)
        this.name = this.constructor.name
        this.status = status
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Não encontrado') {
        super(message, 404)
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Dados inválidos') {
        super(message, 400)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado') {
        super(message, 403)
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflito de dados') {
        super(message, 409)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Não autenticado') {
        super(message, 401)
    }
}
