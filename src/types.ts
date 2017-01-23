import * as ts from 'typescript';

export interface LineNumber {
  line: number;  // 0-based
}

export interface IAssertion extends LineNumber {
  kind: string;
}

export interface TypeAssertion extends IAssertion {
  kind: 'type';
  type: string;
}

export interface ErrorAssertion extends IAssertion {
  kind: 'error';
  pattern: string;
}

export type Assertion = TypeAssertion | ErrorAssertion;

export interface NodedAssertion {
  assertion: Assertion;
  node: ts.Node;
  type: ts.Type;
  error?: ts.Diagnostic;
}

export interface IFailure extends LineNumber {
  code?: string;
  type: string;
}

export interface WrongTypeFailure extends IFailure {
  type: 'WRONG_TYPE';
  expectedType: string;
  actualType: string;
}

export interface UnexpectedErrorFailure extends IFailure {
  type: 'UNEXPECTED_ERROR';
  message: string;
}

export interface WrongErrorFailure extends IFailure {
  type: 'WRONG_ERROR';
  expectedMessage: string;
  actualMessage: string;
}

export interface MissingErrorFailure extends IFailure {
  type: 'MISSING_ERROR';
  message: string;
}

export type Failure = WrongTypeFailure | UnexpectedErrorFailure | WrongErrorFailure | MissingErrorFailure;

export interface Report {
  numSuccesses: number;
  failures: Failure[];
}
