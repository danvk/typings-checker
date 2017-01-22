import * as ts from 'typescript';

interface LineNumber {
  line: number;  // 0-based
}

interface IAssertion extends LineNumber {
  kind: string;
}

interface TypeAssertion extends IAssertion {
  kind: 'type';
  type: string;
}

interface ErrorAssertion extends IAssertion {
  kind: 'error';
  pattern: string;
}

type Assertion = TypeAssertion | ErrorAssertion;

export interface NodedAssertion {
  assertion: Assertion;
  node: ts.Node;
  type: ts.Type;
  error?: ts.Diagnostic;
}

export interface IFailure extends LineNumber {
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

type Failure = WrongTypeFailure | UnexpectedErrorFailure | WrongErrorFailure | MissingErrorFailure;

export interface Report {
  numSuccesses: number;
  failures: Failure[];
}
