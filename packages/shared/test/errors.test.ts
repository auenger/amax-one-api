import { describe, it, expect } from 'vitest'
import { ProblemError, createProblemError } from '../src/errors/index.js'

describe('ProblemError', () => {
  it('should create an error with all fields', () => {
    const error = new ProblemError(
      400,
      'https://example.com/errors/bad-request',
      'Bad Request',
      'Invalid parameter',
      '/api/v1/test',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ProblemError)
    expect(error.name).toBe('ProblemError')
    expect(error.status).toBe(400)
    expect(error.type).toBe('https://example.com/errors/bad-request')
    expect(error.title).toBe('Bad Request')
    expect(error.detail).toBe('Invalid parameter')
    expect(error.instance).toBe('/api/v1/test')
  })

  it('should serialize to JSON correctly', () => {
    const error = new ProblemError(
      404,
      'https://example.com/errors/not-found',
      'Not Found',
      'Resource not found',
    )
    const json = error.toJSON()

    expect(json).toEqual({
      status: 404,
      type: 'https://example.com/errors/not-found',
      title: 'Not Found',
      detail: 'Resource not found',
    })
  })

  it('should omit undefined fields in JSON', () => {
    const error = new ProblemError(
      500,
      'https://example.com/errors/internal',
      'Internal Server Error',
    )
    const json = error.toJSON()

    expect(json).not.toHaveProperty('detail')
    expect(json).not.toHaveProperty('instance')
  })
})

describe('createProblemError', () => {
  it('should create a ProblemError with default type', () => {
    const error = createProblemError(400, 'Bad Request', '参数错误')

    expect(error).toBeInstanceOf(ProblemError)
    expect(error.status).toBe(400)
    expect(error.title).toBe('Bad Request')
    expect(error.detail).toBe('参数错误')
    expect(error.type).toBe('https://httpstatuses.com/400')
  })

  it('should create a ProblemError with custom type', () => {
    const error = createProblemError(
      422,
      'Validation Error',
      'Field is required',
      'https://example.com/errors/validation',
    )

    expect(error.type).toBe('https://example.com/errors/validation')
  })
})
