#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// cli/mere-email.ts
import { mkdir as mkdir2, readFile as readFile3, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve as resolvePath2 } from "node:path";

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// packages/core/email-product.ts
var EMAIL_WORKSPACE_BASE_DOMAINS = [
  "meresmb.com",
  "mere.email",
  "bizpei.com",
  "mailpei.com",
  "peihub.com"
];
var DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN = EMAIL_WORKSPACE_BASE_DOMAINS[0];
var EMAIL_BRIDGE_STATUSES = ["connected", "disconnected"];
var EMAIL_BRIDGE_HEALTH_STATES = ["healthy", "degraded", "disconnected"];
var EMAIL_WORKSPACE_LIFECYCLE_STATES = [
  "trialing",
  "active",
  "grace",
  "deleted"
];

// packages/core/contracts/internal.ts
var nonEmptyString = (label) => external_exports.string().trim().min(1, `${label} is required.`);
var optionalNullableString = external_exports.string().trim().nullable().optional();
var mailboxLocalPartSchema = external_exports.string().trim().min(1, "mailboxLocalPart is required.").max(64, "mailboxLocalPart must be 64 characters or fewer.").regex(
  /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/i,
  "mailboxLocalPart may only contain letters, numbers, dots, underscores, plus, and hyphen."
).transform((value) => value.toLowerCase());
var EmailRoutingStatusSchema = external_exports.enum(["pending", "ready", "failed"]);
var EmailBridgeStatusSchema = external_exports.enum(EMAIL_BRIDGE_STATUSES);
var EmailBridgeHealthSchema = external_exports.enum(EMAIL_BRIDGE_HEALTH_STATES);
var EmailWorkspaceBaseDomainSchema = external_exports.enum(EMAIL_WORKSPACE_BASE_DOMAINS);
var EmailWorkspaceLifecycleStateSchema = external_exports.enum(
  EMAIL_WORKSPACE_LIFECYCLE_STATES
);
var EmailWorkspaceProvisionInputSchema = external_exports.object({
  zerosmbTenantId: nonEmptyString("zerosmbTenantId"),
  slug: nonEmptyString("slug"),
  baseDomain: external_exports.string().trim().default(DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN),
  name: nonEmptyString("name"),
  organizationId: nonEmptyString("organizationId"),
  callbackUrl: nonEmptyString("callbackUrl"),
  callbackBearerToken: nonEmptyString("callbackBearerToken"),
  mailboxAddress: external_exports.string().trim().optional(),
  lifecycleState: EmailWorkspaceLifecycleStateSchema.optional(),
  trialEndsAt: optionalNullableString,
  graceEndsAt: optionalNullableString,
  activatedAt: optionalNullableString,
  deletionScheduledAt: optionalNullableString
});
var EmailWorkspaceLifecycleResponseSchema = external_exports.object({
  externalAccountId: nonEmptyString("externalAccountId"),
  externalWorkspaceId: nonEmptyString("externalWorkspaceId"),
  canonicalUrl: nonEmptyString("canonicalUrl"),
  status: EmailBridgeStatusSchema,
  health: EmailBridgeHealthSchema,
  lastError: external_exports.string().trim().nullable()
});
var EmailWorkspaceSyncRequestSchema = external_exports.object({
  zerosmbTenantId: nonEmptyString("zerosmbTenantId"),
  callbackUrl: optionalNullableString,
  callbackBearerToken: optionalNullableString,
  lifecycleState: EmailWorkspaceLifecycleStateSchema.optional(),
  trialEndsAt: optionalNullableString,
  graceEndsAt: optionalNullableString,
  activatedAt: optionalNullableString,
  deletionScheduledAt: optionalNullableString
});
var EmailWorkspaceDeleteResultSchema = external_exports.object({
  deleted: external_exports.boolean()
});
var EmailImportMailboxSchema = external_exports.object({
  id: nonEmptyString("id"),
  address: nonEmptyString("address"),
  displayName: external_exports.string().trim().nullable(),
  type: nonEmptyString("type")
});
var EmailImportThreadSchema = external_exports.object({
  id: nonEmptyString("id"),
  mailboxId: nonEmptyString("mailboxId"),
  subject: external_exports.string(),
  participants: external_exports.array(nonEmptyString("participants")),
  lastMessageAt: nonEmptyString("lastMessageAt"),
  messageCount: external_exports.number().int().nonnegative(),
  isArchived: external_exports.boolean(),
  isStarred: external_exports.boolean(),
  isRead: external_exports.boolean(),
  labels: external_exports.array(external_exports.string()),
  snippet: external_exports.string(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt")
});
var EmailImportAttachmentSchema = external_exports.object({
  id: nonEmptyString("id"),
  messageId: nonEmptyString("messageId"),
  filename: nonEmptyString("filename"),
  mimeType: external_exports.string().trim().nullable(),
  sizeBytes: external_exports.number().int().nonnegative(),
  r2Key: nonEmptyString("r2Key"),
  createdAt: nonEmptyString("createdAt"),
  contentBase64: external_exports.string().trim().nullable().optional()
});
var EmailImportMessageSchema = external_exports.object({
  id: nonEmptyString("id"),
  threadId: nonEmptyString("threadId"),
  mailboxId: nonEmptyString("mailboxId"),
  messageIdHeader: external_exports.string().trim().nullable(),
  inReplyTo: external_exports.string().trim().nullable(),
  referencesHeader: external_exports.string().trim().nullable(),
  fromAddress: nonEmptyString("fromAddress"),
  fromName: external_exports.string().trim().nullable(),
  toAddresses: external_exports.array(nonEmptyString("toAddresses")),
  ccAddresses: external_exports.array(external_exports.string()),
  bccAddresses: external_exports.array(external_exports.string()),
  subject: external_exports.string(),
  bodyText: external_exports.string().nullable(),
  bodyHtml: external_exports.string().nullable(),
  bodyR2Key: external_exports.string().trim().nullable(),
  direction: external_exports.enum(["inbound", "outbound"]),
  isRead: external_exports.boolean(),
  isStarred: external_exports.boolean(),
  sentAt: nonEmptyString("sentAt"),
  providerMessageId: external_exports.string().trim().nullable(),
  attachmentCount: external_exports.number().int().nonnegative(),
  createdAt: nonEmptyString("createdAt"),
  attachments: external_exports.array(EmailImportAttachmentSchema).default([])
});
var EmailImportThreadExportSchema = external_exports.object({
  thread: EmailImportThreadSchema,
  messages: external_exports.array(EmailImportMessageSchema).default([])
});
var EmailWorkspaceImportRequestSchema = external_exports.object({
  zerosmbTenantId: nonEmptyString("zerosmbTenantId"),
  slug: nonEmptyString("slug"),
  baseDomain: nonEmptyString("baseDomain").default(DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN),
  mailboxes: external_exports.array(EmailImportMailboxSchema).default([]),
  threads: external_exports.array(EmailImportThreadExportSchema).default([])
});
var EmailWorkspaceImportRunStatusSchema = external_exports.enum([
  "queued",
  "staging",
  "finalizing",
  "completed",
  "failed"
]);
var DomainRegistrationStateSchema = external_exports.enum([
  "pending",
  "registered",
  "zone_pending",
  "zone_active",
  "provisioned",
  "failed"
]);
var DomainContactSchema = external_exports.object({
  firstName: nonEmptyString("firstName"),
  lastName: nonEmptyString("lastName"),
  email: external_exports.string().trim().email("email must be valid."),
  phone: nonEmptyString("phone"),
  address1: nonEmptyString("address1"),
  city: nonEmptyString("city"),
  state: nonEmptyString("state"),
  postalCode: nonEmptyString("postalCode"),
  country: external_exports.string().trim().length(2, "country must be a 2-letter country code.").transform((value) => value.toUpperCase())
});
var DomainPriceSchema = external_exports.object({
  amount: nonEmptyString("amount"),
  currency: nonEmptyString("currency")
});
var DomainRegistrarProviderSchema = external_exports.enum(["opensrs", "cloudflare"]);
var DomainSearchResultSchema = external_exports.object({
  domain: nonEmptyString("domain"),
  available: external_exports.boolean(),
  registrar: DomainRegistrarProviderSchema,
  price: DomainPriceSchema.optional(),
  reason: external_exports.string().trim().optional(),
  tier: external_exports.string().trim().optional(),
  responseCode: external_exports.string().trim().optional(),
  responseText: external_exports.string().trim().optional()
});
var DomainRegisterInputSchema = external_exports.object({
  organizationId: nonEmptyString("organizationId"),
  workspaceId: nonEmptyString("workspaceId"),
  domain: nonEmptyString("domain"),
  mailboxLocalPart: mailboxLocalPartSchema,
  period: external_exports.number().int().min(1).max(10).default(1),
  contact: DomainContactSchema
});
var DomainRegistrationStatusSchema = external_exports.object({
  id: nonEmptyString("id"),
  workspaceId: external_exports.string().trim().nullable(),
  organizationId: nonEmptyString("organizationId"),
  domain: nonEmptyString("domain"),
  registrar: DomainRegistrarProviderSchema,
  status: DomainRegistrationStateSchema,
  opensrsOrderId: external_exports.string().trim().nullable(),
  cfZoneId: external_exports.string().trim().nullable(),
  cfNameservers: external_exports.array(nonEmptyString("cfNameservers")).default([]),
  contact: DomainContactSchema,
  registrationPeriod: external_exports.number().int().min(1),
  priceAmount: external_exports.string().trim().nullable(),
  priceCurrency: external_exports.string().trim().nullable(),
  requestedMailboxAddress: external_exports.string().trim().nullable(),
  error: external_exports.string().trim().nullable(),
  lastStep: external_exports.string().trim().nullable(),
  registeredAt: external_exports.string().trim().nullable(),
  zoneCreatedAt: external_exports.string().trim().nullable(),
  zoneActivatedAt: external_exports.string().trim().nullable(),
  provisionedAt: external_exports.string().trim().nullable(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt")
});
var DomainTransferRequestStatusSchema = external_exports.enum([
  "requested",
  "in_progress",
  "completed",
  "rejected",
  "cancelled"
]);
var DomainTransferRequestSchema = external_exports.object({
  id: nonEmptyString("id"),
  workspaceId: nonEmptyString("workspaceId"),
  domainRegistrationId: nonEmptyString("domainRegistrationId"),
  organizationId: nonEmptyString("organizationId"),
  domain: nonEmptyString("domain"),
  registrarProvider: DomainRegistrarProviderSchema,
  status: DomainTransferRequestStatusSchema,
  requestedByUserId: nonEmptyString("requestedByUserId"),
  requestedByEmail: external_exports.string().trim().email("requestedByEmail must be valid."),
  requestedByName: external_exports.string().trim().nullable(),
  requestNote: external_exports.string().trim().nullable(),
  resolutionNote: external_exports.string().trim().nullable(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt"),
  startedAt: external_exports.string().trim().nullable(),
  completedAt: external_exports.string().trim().nullable(),
  rejectedAt: external_exports.string().trim().nullable(),
  cancelledAt: external_exports.string().trim().nullable()
});
var DomainContactPrefillResponseSchema = external_exports.object({
  contact: DomainContactSchema.partial(),
  source: external_exports.object({
    workspaceName: external_exports.string().trim().nullable().optional(),
    organizationName: external_exports.string().trim().nullable().optional(),
    ownerEmail: external_exports.string().trim().nullable().optional(),
    ownerName: external_exports.string().trim().nullable().optional()
  }).optional()
});
var EmailWorkspaceImportStatusSchema = external_exports.object({
  runId: nonEmptyString("runId"),
  workspaceId: nonEmptyString("workspaceId"),
  zerosmbTenantId: nonEmptyString("zerosmbTenantId"),
  status: EmailWorkspaceImportRunStatusSchema,
  error: external_exports.string().trim().nullable(),
  requestedMailboxes: external_exports.number().int().nonnegative(),
  requestedThreads: external_exports.number().int().nonnegative(),
  requestedMessages: external_exports.number().int().nonnegative(),
  requestedAttachments: external_exports.number().int().nonnegative(),
  importedMailboxes: external_exports.number().int().nonnegative(),
  importedThreads: external_exports.number().int().nonnegative(),
  importedMessages: external_exports.number().int().nonnegative(),
  importedAttachments: external_exports.number().int().nonnegative(),
  stagedBlobCount: external_exports.number().int().nonnegative(),
  createdAt: nonEmptyString("createdAt"),
  updatedAt: nonEmptyString("updatedAt"),
  startedAt: external_exports.string().trim().nullable(),
  completedAt: external_exports.string().trim().nullable()
});

// packages/core/json.ts
var JsonBoundaryError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.name = "JsonBoundaryError";
    this.status = status;
  }
};
function defaultInvalidBodyMessage(options) {
  return options.invalidBodyMessage ?? "Invalid JSON body";
}
function parseJsonText(text, options = {}) {
  try {
    return JSON.parse(text);
  } catch {
    throw new JsonBoundaryError(options.invalidJsonMessage ?? "Invalid JSON", options.status ?? 400);
  }
}
function parseJsonWithSchema(schema, value, options = {}) {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  throw new JsonBoundaryError(
    result.error.issues[0]?.message ?? defaultInvalidBodyMessage(options),
    options.status ?? 400
  );
}

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/session.ts
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
function stateHome(env) {
  const homeDir = env.HOME?.trim() || os.homedir();
  return env.XDG_STATE_HOME?.trim() || path.join(homeDir, ".local", "state");
}
function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
function resolveCliPaths(appName, env = process.env) {
  const stateDir = path.join(stateHome(env), appName);
  return {
    stateDir,
    sessionFile: path.join(stateDir, "session.json")
  };
}
async function loadCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    try {
      const raw = await readFile(paths.sessionFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) {
        return parsed;
      }
      return null;
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }
  return null;
}
async function saveCliSession(input) {
  const paths = resolveCliPaths(input.appName, input.env ?? process.env);
  await mkdir(paths.stateDir, { recursive: true });
  await writeFile(paths.sessionFile, `${JSON.stringify(input.session, null, 2)}
`, "utf8");
  await chmod(paths.sessionFile, 384).catch(() => void 0);
}
async function clearCliSession(input) {
  const env = input.env ?? process.env;
  const appNames = [input.appName, ...input.legacyAppNames ?? []];
  for (const appName of appNames) {
    const paths = resolveCliPaths(appName, env);
    await rm(paths.sessionFile, { force: true });
  }
}
function resolveWorkspaceSelection(workspaces, selector) {
  const normalized = selector?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return workspaces.find(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  ) ?? null;
}
function requireWorkspaceSelection(workspaces, selector) {
  const workspace = resolveWorkspaceSelection(workspaces, selector);
  if (!workspace) {
    throw new Error(`Workspace ${selector ?? "(missing)"} is not available in this session.`);
  }
  return workspace;
}
function sessionNeedsRefresh(session, targetWorkspaceId, now = Date.now()) {
  const currentWorkspaceId = session.workspace?.id ?? null;
  if ((targetWorkspaceId ?? null) !== currentWorkspaceId) {
    return true;
  }
  const expiresAtMs = session.accessTokenClaims.exp * 1e3 || Date.parse(session.expiresAt);
  return !Number.isFinite(expiresAtMs) || expiresAtMs - now <= 6e4;
}
function createLocalSession(payload, options) {
  return {
    ...payload,
    version: 1,
    baseUrl: normalizeBaseUrl(options.baseUrl),
    defaultWorkspaceId: options.defaultWorkspaceId ?? payload.defaultWorkspaceId,
    lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mergeSessionPayload(current, payload, options = {}) {
  const nextDefaultWorkspaceId = options.persistDefaultWorkspace ? payload.workspace?.id ?? payload.defaultWorkspaceId : current.defaultWorkspaceId ?? payload.defaultWorkspaceId;
  return {
    ...current,
    ...payload,
    baseUrl: normalizeBaseUrl(options.baseUrl ?? current.baseUrl),
    defaultWorkspaceId: nextDefaultWorkspaceId ?? null,
    lastRefreshAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// packages/core/internal-rpc.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function buildBearerHeaders(token, headers = {}) {
  const next = new Headers(headers);
  next.set("authorization", `Bearer ${token}`);
  return next;
}
function parseRpcErrorPayload(value) {
  if (!isRecord(value)) return null;
  if (!isRecord(value.error)) return null;
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") {
    return null;
  }
  return {
    code: value.error.code,
    message: value.error.message,
    ...Object.prototype.hasOwnProperty.call(value.error, "details") ? { details: value.error.details } : {}
  };
}

// cli/client.ts
var CliError = class extends Error {
  exitCode;
  constructor(message, exitCode2 = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode2;
  }
};
function normalizeBaseUrl2(baseUrl) {
  const url = new URL(baseUrl);
  return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function expectRecord(value, label) {
  if (!isRecord2(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}
function expectString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
function expectNullableString(value, label) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
  return value;
}
function expectBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}
function expectNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
}
function expectArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}
function expectStringArray(value, label) {
  return expectArray(value, label).map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(`${label} must be an array of strings`);
    }
    return entry;
  });
}
function parseLifecycleState(value, label) {
  const state = expectString(value, label);
  if (!EMAIL_WORKSPACE_LIFECYCLE_STATES.includes(state)) {
    throw new Error(
      `${label} must be one of ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}`
    );
  }
  return state;
}
function parseMailbox(value) {
  const record = expectRecord(value, "mailbox");
  return {
    id: expectString(record.id, "mailbox.id"),
    address: expectString(record.address, "mailbox.address"),
    displayName: expectNullableString(record.displayName, "mailbox.displayName"),
    type: expectString(record.type, "mailbox.type")
  };
}
function parseThread(value) {
  const record = expectRecord(value, "thread");
  return {
    id: expectString(record.id, "thread.id"),
    mailboxId: expectString(record.mailboxId, "thread.mailboxId"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    participants: expectStringArray(record.participants, "thread.participants"),
    lastMessageAt: expectString(record.lastMessageAt, "thread.lastMessageAt"),
    messageCount: expectNumber(record.messageCount, "thread.messageCount"),
    isArchived: expectBoolean(record.isArchived, "thread.isArchived"),
    isStarred: expectBoolean(record.isStarred, "thread.isStarred"),
    isRead: expectBoolean(record.isRead, "thread.isRead"),
    labels: expectStringArray(record.labels, "thread.labels"),
    snippet: typeof record.snippet === "string" ? record.snippet : "",
    createdAt: expectString(record.createdAt, "thread.createdAt"),
    updatedAt: expectString(record.updatedAt, "thread.updatedAt")
  };
}
function parseAttachment(value) {
  const record = expectRecord(value, "attachment");
  return {
    id: expectString(record.id, "attachment.id"),
    messageId: expectString(record.messageId, "attachment.messageId"),
    filename: expectString(record.filename, "attachment.filename"),
    mimeType: expectNullableString(record.mimeType, "attachment.mimeType"),
    sizeBytes: expectNumber(record.sizeBytes, "attachment.sizeBytes"),
    r2Key: expectString(record.r2Key, "attachment.r2Key"),
    createdAt: expectString(record.createdAt, "attachment.createdAt")
  };
}
function parseMessage(value) {
  const record = expectRecord(value, "message");
  const direction = expectString(record.direction, "message.direction");
  if (direction !== "inbound" && direction !== "outbound") {
    throw new Error("message.direction must be inbound or outbound");
  }
  return {
    id: expectString(record.id, "message.id"),
    threadId: expectString(record.threadId, "message.threadId"),
    mailboxId: expectString(record.mailboxId, "message.mailboxId"),
    messageIdHeader: expectNullableString(record.messageIdHeader, "message.messageIdHeader"),
    inReplyTo: expectNullableString(record.inReplyTo, "message.inReplyTo"),
    referencesHeader: expectNullableString(
      record.referencesHeader,
      "message.referencesHeader"
    ),
    fromAddress: expectString(record.fromAddress, "message.fromAddress"),
    fromName: expectNullableString(record.fromName, "message.fromName"),
    toAddresses: expectStringArray(record.toAddresses, "message.toAddresses"),
    ccAddresses: expectStringArray(record.ccAddresses, "message.ccAddresses"),
    bccAddresses: expectStringArray(record.bccAddresses, "message.bccAddresses"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    bodyText: expectNullableString(record.bodyText, "message.bodyText"),
    bodyHtml: expectNullableString(record.bodyHtml, "message.bodyHtml"),
    bodyR2Key: expectNullableString(record.bodyR2Key, "message.bodyR2Key"),
    direction,
    isRead: expectBoolean(record.isRead, "message.isRead"),
    isStarred: expectBoolean(record.isStarred, "message.isStarred"),
    sentAt: expectString(record.sentAt, "message.sentAt"),
    providerMessageId: expectNullableString(record.providerMessageId, "message.providerMessageId"),
    attachmentCount: expectNumber(record.attachmentCount, "message.attachmentCount"),
    createdAt: expectString(record.createdAt, "message.createdAt"),
    attachments: expectArray(record.attachments ?? [], "message.attachments").map(parseAttachment)
  };
}
function parseBootstrapPayload(value) {
  const record = expectRecord(value, "bootstrap payload");
  return {
    lifecycleState: parseLifecycleState(record.lifecycleState, "lifecycleState"),
    trialEndsAt: expectNullableString(record.trialEndsAt, "trialEndsAt"),
    graceEndsAt: expectNullableString(record.graceEndsAt, "graceEndsAt"),
    activatedAt: expectNullableString(record.activatedAt, "activatedAt"),
    deletionScheduledAt: expectNullableString(
      record.deletionScheduledAt,
      "deletionScheduledAt"
    ),
    readonlyReason: expectNullableString(record.readonlyReason, "readonlyReason"),
    mailboxes: expectArray(record.mailboxes, "mailboxes").map(parseMailbox),
    defaultMailboxId: expectNullableString(record.defaultMailboxId, "defaultMailboxId"),
    defaultMailboxAddress: expectNullableString(
      record.defaultMailboxAddress,
      "defaultMailboxAddress"
    ),
    unreadCount: expectNumber(record.unreadCount, "unreadCount"),
    canRunAgentMail: expectBoolean(record.canRunAgentMail, "canRunAgentMail")
  };
}
function parseMailboxesPayload(value) {
  const record = expectRecord(value, "mailboxes payload");
  return expectArray(record.mailboxes, "mailboxes").map(parseMailbox);
}
function parseSearchMatch(value) {
  const record = expectRecord(value, "search match");
  return {
    messageId: expectString(record.messageId, "match.messageId"),
    fromAddress: expectString(record.fromAddress, "match.fromAddress"),
    subject: typeof record.subject === "string" ? record.subject : "(no subject)",
    sentAt: expectString(record.sentAt, "match.sentAt"),
    snippet: typeof record.snippet === "string" ? record.snippet : ""
  };
}
function parseSearchResult(value) {
  const record = expectRecord(value, "search result");
  return {
    thread: parseThread(record.thread),
    mailboxId: expectString(record.mailboxId, "result.mailboxId"),
    matches: expectArray(record.matches, "result.matches").map(parseSearchMatch)
  };
}
function parseSearchResultsPayload(value) {
  const record = expectRecord(value, "search payload");
  return expectArray(record.results, "results").map(parseSearchResult);
}
function parseThreadState(value) {
  const record = expectRecord(value, "thread payload");
  return {
    mailbox: parseMailbox(record.mailbox),
    thread: parseThread(record.thread),
    messages: expectArray(record.messages, "messages").map(parseMessage)
  };
}
function parseThreadActionResult(value) {
  const record = expectRecord(value, "thread action payload");
  return {
    thread: parseThread(record.thread),
    envelope: record.envelope,
    productEvent: record.productEvent,
    delivery: record.delivery
  };
}
function parseSendResult(value) {
  const record = expectRecord(value, "send payload");
  return {
    threadId: expectString(record.threadId, "threadId"),
    messageId: expectString(record.messageId, "messageId"),
    providerMessageId: expectNullableString(record.providerMessageId, "providerMessageId"),
    envelope: record.envelope,
    productEvent: record.productEvent,
    delivery: record.delivery
  };
}
function parseDisconnectResult(value) {
  const record = expectRecord(value, "disconnect payload");
  return {
    disconnected: expectBoolean(record.disconnected, "disconnected")
  };
}
function parseWorkspaceExportPayload(value) {
  parseJsonWithSchema(EmailWorkspaceImportRequestSchema, value, {
    invalidBodyMessage: "Email workspace export payload is invalid."
  });
  return value;
}
function parseInboundResult(value) {
  const record = expectRecord(value, "inbound payload");
  const externalObjectType = record.externalObjectType;
  if (externalObjectType !== null && externalObjectType !== void 0 && externalObjectType !== "mailbox" && externalObjectType !== "thread" && externalObjectType !== "message") {
    throw new Error(
      "externalObjectType must be mailbox, thread, message, or null"
    );
  }
  const normalizedExternalObjectType = externalObjectType === void 0 ? null : externalObjectType;
  return {
    accepted: expectBoolean(record.accepted, "accepted"),
    scenarioId: expectNullableString(record.scenarioId, "scenarioId"),
    sourceEventId: expectNullableString(record.sourceEventId, "sourceEventId"),
    externalObjectType: normalizedExternalObjectType,
    externalObjectId: expectNullableString(record.externalObjectId, "externalObjectId"),
    canonicalUrl: expectNullableString(record.canonicalUrl, "canonicalUrl"),
    workspaceResponse: record.workspaceResponse
  };
}
function passthroughJson(value) {
  return value;
}
async function parseErrorMessage(response) {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`.trim();
  }
  try {
    const payload = parseJsonText(text, { invalidJsonMessage: "Invalid error response JSON." });
    const rpcError = parseRpcErrorPayload(payload);
    if (rpcError) {
      return rpcError.message;
    }
    if (isRecord2(payload) && typeof payload.error === "string") {
      return payload.error;
    }
    return text;
  } catch {
    return text;
  }
}
function filenameFromContentDisposition(value) {
  if (!value) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const quotedMatch = /filename="([^"]+)"/i.exec(value);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = /filename=([^;]+)/i.exec(value);
  return plainMatch?.[1]?.trim() ?? null;
}
var EmailCliClient = class {
  baseUrl;
  token;
  fetchImpl;
  constructor(options) {
    this.baseUrl = normalizeBaseUrl2(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }
  async workspaceBootstrap(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/bootstrap"),
      {},
      { parser: parseBootstrapPayload }
    );
  }
  async provisionWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "provision"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceLifecycleResponseSchema, value, {
          invalidBodyMessage: "Workspace lifecycle response is invalid."
        })
      }
    );
  }
  async syncWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "sync"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceLifecycleResponseSchema, value, {
          invalidBodyMessage: "Workspace lifecycle response is invalid."
        })
      }
    );
  }
  async disconnectWorkspace(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "connection"),
      { method: "DELETE" },
      { parser: parseDisconnectResult }
    );
  }
  async listMailboxes(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/mailboxes"),
      {},
      { parser: parseMailboxesPayload }
    );
  }
  async searchThreads(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/search"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: parseSearchResultsPayload }
    );
  }
  async showThread(workspaceId, threadId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/threads/${encodeURIComponent(threadId)}`
      ),
      {},
      { parser: parseThreadState }
    );
  }
  async downloadAttachment(workspaceId, attachmentId) {
    if (!this.token) {
      throw new CliError("This command requires `mere-email auth login` or MERE_EMAIL_TOKEN.");
    }
    const headers = buildBearerHeaders(this.token);
    headers.set("accept", "*/*");
    const agentHeaders = this.agentHeaders();
    for (const [key, value] of agentHeaders.entries()) {
      headers.set(key, value);
    }
    const response = await this.fetchImpl(
      new URL(
        this.workspacePath(
          workspaceId,
          `agent-mail/attachments/${encodeURIComponent(attachmentId)}/download`
        ),
        this.baseUrl
      ),
      { headers }
    );
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`
      );
    }
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
      contentType: response.headers.get("content-type")
    };
  }
  async createDraft(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/drafts"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: passthroughJson }
    );
  }
  async showDraft(workspaceId, draftId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/drafts/${encodeURIComponent(draftId)}`
      ),
      {},
      { parser: passthroughJson }
    );
  }
  async discardDraft(workspaceId, draftId) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/drafts/${encodeURIComponent(draftId)}/discard`
      ),
      { method: "POST" },
      { parser: passthroughJson }
    );
  }
  async actOnThread(workspaceId, threadId, action) {
    return this.request(
      this.workspacePath(
        workspaceId,
        `agent-mail/threads/${encodeURIComponent(threadId)}/actions`
      ),
      {
        method: "POST",
        body: JSON.stringify({ action })
      },
      { parser: parseThreadActionResult }
    );
  }
  async send(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/send"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: parseSendResult }
    );
  }
  async searchDomain(domain) {
    return this.request(
      `/api/internal/mere/domains/search?domain=${encodeURIComponent(domain)}`,
      {},
      { parser: passthroughJson }
    );
  }
  async registerDomain(input) {
    return this.request(
      "/api/internal/mere/domains/register",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      { parser: passthroughJson }
    );
  }
  async showDomainRegistration(registrationId) {
    return this.request(
      `/api/internal/mere/domains/${encodeURIComponent(registrationId)}`,
      {},
      { parser: passthroughJson }
    );
  }
  async exportWorkspace(workspaceId) {
    return this.request(
      this.workspacePath(workspaceId, "agent-mail/export"),
      {},
      { parser: parseWorkspaceExportPayload }
    );
  }
  async importWorkspace(workspaceId, input) {
    return this.request(
      this.workspacePath(workspaceId, "import"),
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceImportStatusSchema, value, {
          invalidBodyMessage: "Import status payload is invalid."
        })
      }
    );
  }
  async importStatus(workspaceId, runId) {
    const params = new URLSearchParams();
    if (runId) {
      params.set("runId", runId);
    }
    const suffix = params.size > 0 ? `import?${params.toString()}` : "import";
    return this.request(
      this.workspacePath(workspaceId, suffix),
      {},
      {
        parser: (value) => parseJsonWithSchema(EmailWorkspaceImportStatusSchema, value, {
          invalidBodyMessage: "Import status payload is invalid."
        })
      }
    );
  }
  async simulateInbound(input) {
    return this.request(
      "/api/internal/e2e/ingress/mail",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        parser: parseInboundResult,
        useRpcEnvelope: false
      }
    );
  }
  workspacePath(workspaceId, suffix) {
    return `/api/internal/mere/workspaces/${encodeURIComponent(workspaceId)}/${suffix}`;
  }
  isAgentMailPath(path2) {
    return path2.includes("/agent-mail/");
  }
  agentHeaders() {
    return new Headers({
      "x-mere-agent-id": "mere-email-cli",
      "x-mere-session-id": "cli-session",
      "x-mere-actor-type": "cli",
      "x-mere-actor-label": "mere-email CLI",
      "x-mere-tool-key": "mere-email-cli"
    });
  }
  async request(path2, init, options) {
    const requiresToken = options.requiresToken ?? true;
    if (requiresToken && !this.token) {
      throw new CliError("This command requires `mere-email auth login` or MERE_EMAIL_TOKEN.");
    }
    const headers = this.token ? buildBearerHeaders(this.token, init.headers) : new Headers(init.headers);
    headers.set("accept", "application/json");
    if (this.isAgentMailPath(path2)) {
      const agentHeaders = this.agentHeaders();
      for (const [key, value] of agentHeaders.entries()) {
        headers.set(key, value);
      }
    }
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await this.fetchImpl(new URL(path2, this.baseUrl), {
      ...init,
      headers
    });
    if (!response.ok) {
      throw new CliError(
        `Request failed (${response.status} ${response.statusText}): ${await parseErrorMessage(response)}`
      );
    }
    const text = await response.text();
    const payload = text ? parseJsonText(text, { invalidJsonMessage: "Invalid JSON response." }) : {};
    if (options.useRpcEnvelope === false) {
      return options.parser(payload);
    }
    if (!isRecord2(payload)) {
      throw new CliError("RPC response envelope is invalid.");
    }
    if (payload.ok !== true || !Object.prototype.hasOwnProperty.call(payload, "data")) {
      const rpcError = parseRpcErrorPayload(payload);
      if (rpcError) {
        throw new CliError(rpcError.message);
      }
      throw new CliError("RPC response envelope is invalid.");
    }
    return options.parser(payload.data);
  }
};

// cli/format.ts
function formatTable(headers, rows) {
  const widths = headers.map(
    (header, index) => Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );
  const renderRow = (row) => row.map((cell, index) => cell.padEnd(widths[index], " ")).join("  ");
  return [renderRow(headers), renderRow(widths.map((width) => "-".repeat(width))), ...rows.map(renderRow)].join("\n");
}
function formatKeyValue(entries) {
  const width = Math.max(...entries.map(([key]) => key.length));
  return entries.map(([key, value]) => `${key.padEnd(width, " ")}  ${value}`).join("\n");
}
function formatBoolean(value) {
  return value ? "yes" : "no";
}
function formatNullable(value) {
  return value && value.length > 0 ? value : "\u2014";
}
function formatTimestamp(value) {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const deltaMs = date.getTime() - Date.now();
  const absMs = Math.abs(deltaMs);
  const formatter = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
  const units = [
    ["year", 1e3 * 60 * 60 * 24 * 365],
    ["month", 1e3 * 60 * 60 * 24 * 30],
    ["day", 1e3 * 60 * 60 * 24],
    ["hour", 1e3 * 60 * 60],
    ["minute", 1e3 * 60],
    ["second", 1e3]
  ];
  const [unit, unitMs] = units.find(([, candidateMs]) => absMs >= candidateMs) ?? ["second", 1e3];
  const relative = formatter.format(Math.round(deltaMs / unitMs), unit);
  const absolute = new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
  return `${absolute} (${relative})`;
}
function truncate(value, limit) {
  if (value.length <= limit) return value;
  if (limit <= 3) return value.slice(0, limit);
  return `${value.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
function formatStringList(values) {
  return values.length > 0 ? values.join(", ") : "\u2014";
}
function formatThreadFlags(thread) {
  const flags = [];
  if (!thread.isRead) flags.push("unread");
  if (thread.isStarred) flags.push("starred");
  if (thread.isArchived) flags.push("archived");
  return flags.length > 0 ? flags.join(", ") : "\u2014";
}
function formatMailboxName(mailbox) {
  return mailbox.displayName ? `${mailbox.displayName} <${mailbox.address}>` : mailbox.address;
}
function formatFrom(message) {
  return message.fromName ? `${message.fromName} <${message.fromAddress}>` : message.fromAddress;
}
function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function renderMailboxTable(mailboxes) {
  if (mailboxes.length === 0) {
    return "No mailboxes found.";
  }
  return formatTable(
    ["ID", "ADDRESS", "NAME", "TYPE"],
    mailboxes.map((mailbox) => [
      mailbox.id,
      mailbox.address,
      formatNullable(mailbox.displayName),
      mailbox.type
    ])
  );
}
function renderWorkspaceLifecycle(response) {
  return formatKeyValue([
    ["external account", response.externalAccountId],
    ["external workspace", response.externalWorkspaceId],
    ["canonical url", response.canonicalUrl],
    ["status", response.status],
    ["health", response.health],
    ["last error", formatNullable(response.lastError)]
  ]);
}
function renderBootstrap(payload) {
  const sections = [
    formatKeyValue([
      ["lifecycle", payload.lifecycleState],
      ["agent mail", formatBoolean(payload.canRunAgentMail)],
      ["readonly reason", formatNullable(payload.readonlyReason)],
      ["default mailbox", formatNullable(payload.defaultMailboxAddress)],
      ["unread threads", String(payload.unreadCount)],
      ["trial ends", formatTimestamp(payload.trialEndsAt)],
      ["grace ends", formatTimestamp(payload.graceEndsAt)],
      ["activated", formatTimestamp(payload.activatedAt)],
      ["deletion scheduled", formatTimestamp(payload.deletionScheduledAt)]
    ]),
    "Mailboxes",
    renderMailboxTable(payload.mailboxes)
  ];
  return sections.join("\n\n");
}
function renderMailboxes(mailboxes) {
  return renderMailboxTable(mailboxes);
}
function renderSearchResults(results) {
  if (results.length === 0) {
    return "No threads matched.";
  }
  return formatTable(
    ["THREAD", "SUBJECT", "LAST MESSAGE", "COUNT", "FLAGS", "TOP MATCH"],
    results.map((result) => [
      result.thread.id,
      truncate(result.thread.subject || "(no subject)", 32),
      formatTimestamp(result.thread.lastMessageAt),
      String(result.thread.messageCount),
      formatThreadFlags(result.thread),
      truncate(result.matches[0]?.snippet || result.thread.snippet || "\u2014", 48)
    ])
  );
}
function renderThreadSummary(thread, mailbox) {
  return formatKeyValue([
    ["id", thread.id],
    ["subject", thread.subject || "(no subject)"],
    ["mailbox", formatMailboxName(mailbox)],
    ["participants", formatStringList(thread.participants)],
    ["messages", String(thread.messageCount)],
    ["last message", formatTimestamp(thread.lastMessageAt)],
    ["created", formatTimestamp(thread.createdAt)],
    ["updated", formatTimestamp(thread.updatedAt)],
    ["read", formatBoolean(thread.isRead)],
    ["starred", formatBoolean(thread.isStarred)],
    ["archived", formatBoolean(thread.isArchived)],
    ["labels", formatStringList(thread.labels)],
    ["snippet", formatNullable(thread.snippet)]
  ]);
}
function renderMessage(message) {
  const sections = [
    formatKeyValue([
      ["id", message.id],
      ["direction", message.direction],
      ["from", formatFrom(message)],
      ["to", formatStringList(message.toAddresses)],
      ["cc", formatStringList(message.ccAddresses)],
      ["bcc", formatStringList(message.bccAddresses)],
      ["subject", message.subject || "(no subject)"],
      ["sent", formatTimestamp(message.sentAt)],
      ["created", formatTimestamp(message.createdAt)],
      ["read", formatBoolean(message.isRead)],
      ["starred", formatBoolean(message.isStarred)],
      ["message id", formatNullable(message.messageIdHeader)],
      ["in reply to", formatNullable(message.inReplyTo)],
      ["references", formatNullable(message.referencesHeader)],
      ["provider message id", formatNullable(message.providerMessageId)]
    ]),
    `Body
${message.bodyText?.trim() || "\u2014"}`
  ];
  if (message.attachments.length > 0) {
    sections.push(
      `Attachments
${formatTable(
        ["ID", "FILENAME", "TYPE", "SIZE"],
        message.attachments.map((attachment) => [
          attachment.id,
          attachment.filename,
          formatNullable(attachment.mimeType),
          formatBytes(attachment.sizeBytes)
        ])
      )}`
    );
  }
  return sections.join("\n\n");
}
function renderThread(state) {
  const messageBlocks = state.messages.map(
    (message, index) => [`Message ${index + 1}`, renderMessage(message)].join("\n\n")
  );
  return [
    "Thread",
    renderThreadSummary(state.thread, state.mailbox),
    "Messages",
    messageBlocks.join("\n\n")
  ].join("\n\n");
}
function renderThreadAction(action, result) {
  const label = action === "mark_read" ? "mark read" : action === "star" ? "toggle star" : "archive";
  return formatKeyValue([
    ["action", label],
    ["thread id", result.thread.id],
    ["subject", result.thread.subject || "(no subject)"],
    ["read", formatBoolean(result.thread.isRead)],
    ["starred", formatBoolean(result.thread.isStarred)],
    ["archived", formatBoolean(result.thread.isArchived)],
    ["updated", formatTimestamp(result.thread.updatedAt)]
  ]);
}
function renderSendResult(result) {
  return formatKeyValue([
    ["thread id", result.threadId],
    ["message id", result.messageId],
    ["provider message id", formatNullable(result.providerMessageId)]
  ]);
}
function formatProgress(imported, requested) {
  return `${imported}/${requested}`;
}
function renderImportStatus(status) {
  return formatKeyValue([
    ["run id", status.runId],
    ["workspace", status.workspaceId],
    ["tenant", status.zerosmbTenantId],
    ["status", status.status],
    ["error", formatNullable(status.error)],
    ["mailboxes", formatProgress(status.importedMailboxes, status.requestedMailboxes)],
    ["threads", formatProgress(status.importedThreads, status.requestedThreads)],
    ["messages", formatProgress(status.importedMessages, status.requestedMessages)],
    ["attachments", formatProgress(status.importedAttachments, status.requestedAttachments)],
    ["staged blobs", String(status.stagedBlobCount)],
    ["created", formatTimestamp(status.createdAt)],
    ["updated", formatTimestamp(status.updatedAt)],
    ["started", formatTimestamp(status.startedAt)],
    ["completed", formatTimestamp(status.completedAt)]
  ]);
}
function renderDisconnectResult(result) {
  return formatKeyValue([["disconnected", formatBoolean(result.disconnected)]]);
}
function renderInboundResult(result) {
  const sections = [
    formatKeyValue([
      ["accepted", formatBoolean(result.accepted)],
      ["scenario", formatNullable(result.scenarioId)],
      ["source event", formatNullable(result.sourceEventId)],
      ["object type", formatNullable(result.externalObjectType)],
      ["object id", formatNullable(result.externalObjectId)],
      ["canonical url", formatNullable(result.canonicalUrl)]
    ])
  ];
  if (result.workspaceResponse !== void 0) {
    sections.push(`Workspace Response
${JSON.stringify(result.workspaceResponse, null, 2)}`);
  }
  return sections.join("\n\n");
}

// cli/send-command.ts
import { readFile as readFile2 } from "node:fs/promises";
import { basename, resolve as resolvePath } from "node:path";
async function readAttachmentFiles(filePaths) {
  const attachments = [];
  for (const filePath of filePaths) {
    const absolutePath = resolvePath(filePath);
    let buffer;
    try {
      buffer = await readFile2(absolutePath);
    } catch (error) {
      throw new CliError(
        `Failed to read attachment ${absolutePath}: ${error instanceof Error ? error.message : "Unknown error."}`
      );
    }
    attachments.push({
      filename: basename(absolutePath),
      mimeType: null,
      contentBase64: buffer.toString("base64")
    });
  }
  return attachments;
}
async function buildSendInputFromCliOptions(options) {
  const attachments = await readAttachmentFiles(options.attachPaths);
  if (!options.bodyText.trim() && attachments.length === 0) {
    throw new CliError("send requires --body or at least one --attach path.");
  }
  return {
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    bodyText: options.bodyText,
    ...attachments.length > 0 ? { attachments } : {},
    ...options.mailboxId ? { mailboxId: options.mailboxId } : {},
    ...options.fromName ? { fromName: options.fromName } : {},
    ...options.replyThreadId ? { replyThreadId: options.replyThreadId } : {}
  };
}

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/client.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/contract.ts
var CLI_AUTH_START_PATH = "/api/cli/v1/auth/start";
var CLI_AUTH_EXCHANGE_PATH = "/api/cli/v1/auth/exchange";
var CLI_AUTH_REFRESH_PATH = "/api/cli/v1/auth/refresh";
var CLI_AUTH_LOGOUT_PATH = "/api/cli/v1/auth/logout";
var CLI_AUTH_CALLBACK_URL_QUERY_PARAM = "callback_url";
var CLI_AUTH_REQUEST_QUERY_PARAM = "request";
var CLI_AUTH_CODE_QUERY_PARAM = "code";

// node_modules/.pnpm/@mere+cli-auth@file+..+business+packages+cli-auth_@sveltejs+kit@2.55.0_@sveltejs+vite-p_cce024e09157c6f3a2f48f55311f97e2/node_modules/@mere/cli-auth/src/client.ts
function maybeOpenBrowser(url) {
  try {
    if (process.platform === "darwin") {
      const child2 = spawn("open", [url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    if (process.platform === "win32") {
      const child2 = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
      child2.unref();
      return true;
    }
    const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
async function parseJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message = payload && typeof payload === "object" ? payload.error ?? payload.message ?? `Request failed (${response.status}).` : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}
async function fetchJson(fetchImpl, input) {
  return parseJson(await fetchImpl(input));
}
async function postJson(fetchImpl, input, body) {
  return parseJson(
    await fetchImpl(input, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}
async function waitForCallback(input) {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname !== "/callback") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }
      const requestId = requestUrl.searchParams.get(CLI_AUTH_REQUEST_QUERY_PARAM)?.trim();
      const code = requestUrl.searchParams.get(CLI_AUTH_CODE_QUERY_PARAM)?.trim();
      if (!requestId || !code) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("Missing request or code.");
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><html><body><h1>${input.productLabel} login complete.</h1><p>You can close this window.</p></body></html>`
      );
      void (async () => {
        clearTimeout(timeout);
        server.close();
        try {
          const exchangeUrl = new URL(CLI_AUTH_EXCHANGE_PATH, input.baseUrl);
          resolve(await postJson(input.fetchImpl, exchangeUrl, { requestId, code }));
        } catch (error) {
          reject(error);
        }
      })();
    });
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.listen(0, "127.0.0.1", () => {
      void (async () => {
        try {
          const address = server.address();
          if (!address) {
            throw new Error("Local login callback server could not bind to a port.");
          }
          const callbackUrl = new URL(`http://127.0.0.1:${address.port}/callback`);
          const startUrl = new URL(CLI_AUTH_START_PATH, input.baseUrl);
          startUrl.searchParams.set(CLI_AUTH_CALLBACK_URL_QUERY_PARAM, callbackUrl.toString());
          if (input.workspace?.trim()) {
            startUrl.searchParams.set("workspace", input.workspace.trim());
          }
          const started = await fetchJson(input.fetchImpl, startUrl);
          const opened = maybeOpenBrowser(started.authorizeUrl);
          input.notify(
            opened ? `Opened your browser to complete ${input.productLabel} login.` : `Open this URL to complete ${input.productLabel} login:`
          );
          input.notify(started.authorizeUrl);
        } catch (error) {
          clearTimeout(timeout);
          server.close();
          reject(error);
        }
      })();
    });
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the browser login callback."));
    }, 12e4);
  });
}
async function loginWithBrowser(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const payload = await waitForCallback({
    baseUrl,
    fetchImpl: input.fetchImpl ?? fetch,
    notify: input.notify,
    workspace: input.workspace,
    productLabel: input.productLabel
  });
  return createLocalSession(payload, {
    baseUrl,
    defaultWorkspaceId: payload.workspace?.id ?? payload.defaultWorkspaceId
  });
}
async function refreshRemoteSession(input) {
  const refreshUrl = new URL(CLI_AUTH_REFRESH_PATH, normalizeBaseUrl(input.baseUrl));
  return postJson(input.fetchImpl ?? fetch, refreshUrl, {
    refreshToken: input.refreshToken,
    workspace: input.workspace ?? null
  });
}
async function logoutRemoteSession(input) {
  const logoutUrl = new URL(CLI_AUTH_LOGOUT_PATH, normalizeBaseUrl(input.baseUrl));
  await postJson(input.fetchImpl ?? fetch, logoutUrl, {
    refreshToken: input.refreshToken
  });
}

// cli/session.ts
var APP_NAME = "mere-email";
async function loadSession(env = process.env) {
  return loadCliSession({ appName: APP_NAME, env });
}
async function saveSession(session, env = process.env) {
  await saveCliSession({ appName: APP_NAME, session, env });
}
async function clearSession(env = process.env) {
  await clearCliSession({ appName: APP_NAME, env });
}

// cli/auth.ts
async function loginWithBrowser2(input) {
  const session = await loginWithBrowser({
    baseUrl: input.baseUrl,
    workspace: input.workspace,
    fetchImpl: input.fetchImpl,
    notify: input.notify,
    productLabel: "mere-email"
  });
  await saveSession(session, input.env);
  return session;
}
async function refreshRemoteSession2(session, input = {}) {
  const payload = await refreshRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    workspace: input.workspace ?? null,
    fetchImpl: input.fetchImpl
  });
  return mergeSessionPayload(session, payload, {
    persistDefaultWorkspace: input.persistDefaultWorkspace
  });
}
async function ensureWorkspaceSession(session, input = {}) {
  const targetWorkspace = input.workspace?.trim() ? requireWorkspaceSelection(session.workspaces, input.workspace) : requireWorkspaceSelection(session.workspaces, session.defaultWorkspaceId);
  if (!sessionNeedsRefresh(session, targetWorkspace.id)) {
    return session;
  }
  return refreshRemoteSession2(session, {
    workspace: targetWorkspace.id,
    fetchImpl: input.fetchImpl
  });
}
async function logoutRemote(input = {}) {
  const session = await loadSession(input.env);
  if (!session) {
    return false;
  }
  await logoutRemoteSession({
    baseUrl: session.baseUrl,
    refreshToken: session.refreshToken,
    fetchImpl: input.fetchImpl
  }).catch(() => void 0);
  await clearSession(input.env);
  return true;
}

// cli/mere-email.ts
var GLOBAL_FLAG_SPEC = {
  "base-url": "string",
  token: "string",
  workspace: "string",
  json: "boolean",
  help: "boolean",
  version: "boolean",
  "no-interactive": "boolean",
  yes: "boolean",
  confirm: "string"
};
var activeSession = null;
var HELP_TEXT = `mere-email CLI

Usage:
  mere-email [global flags] <command> [args]

Global flags:
  --base-url URL       Override MERE_EMAIL_BASE_URL
  --token TOKEN        Override MERE_EMAIL_TOKEN
  --workspace ID       Override MERE_EMAIL_WORKSPACE_ID
  --json               Write machine-readable JSON
  --version            Show the CLI version
  -v                   Show the CLI version
  --no-interactive     Do not attempt interactive prompts
  --yes                Required for destructive automation
  --confirm ID         Exact target required with --yes for destructive commands
  --help               Show this help

Commands:
  completion [bash|zsh|fish]

  auth login
  auth whoami
  auth logout

  workspace list
  workspace current
  workspace use <id|slug|host>
  workspace bootstrap
  workspace provision --slug SLUG --name NAME --organization-id ID --callback-url URL --callback-bearer-token TOKEN [--base-domain DOMAIN] [--mailbox-address ADDRESS] [--lifecycle-state STATE] [--trial-ends-at ISO|null] [--grace-ends-at ISO|null] [--activated-at ISO|null] [--deletion-scheduled-at ISO|null]
  workspace sync [--lifecycle-state STATE] [--trial-ends-at ISO|null] [--grace-ends-at ISO|null] [--activated-at ISO|null] [--deletion-scheduled-at ISO|null]
  workspace disconnect

  mailboxes list

  threads search <query> [--limit N]
  threads show <thread-id>
  threads read <thread-id>
  threads star <thread-id>
  threads archive <thread-id>

  drafts create --data JSON|--data-file FILE
  drafts show <draft-id>
  drafts discard <draft-id>

  attachments list <thread-id>
  attachments download <attachment-id> --output FILE

  domains search <domain>
  domains register --data JSON|--data-file FILE [--domain DOMAIN] [--organization-id ID]
  domains show <registration-id>

  send --to addr --subject "..." [--body "..."] [--attach /path/to/file] [--to addr2] [--cc addr] [--bcc addr] [--mailbox-id ID] [--from-name NAME] [--reply-thread-id ID]

  export
  import --file payload.json
  import status [--run-id ID]

  inbound --file payload.json

Environment:
  MERE_EMAIL_BASE_URL      Worker URL, for example https://mere.email or http://localhost:8787
  MERE_EMAIL_TOKEN         Bearer token override for internal/service access
  MERE_EMAIL_WORKSPACE_ID  Default ZeroSMB workspace / tenant id

Notes:
  Base domains: ${EMAIL_WORKSPACE_BASE_DOMAINS.join(", ")}
  Lifecycle states: ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}
  Nullable lifecycle flags accept the literal value "null" to clear a value.
`;
function helpJson() {
  return {
    name: "mere-email",
    usage: "mere-email [global flags] <command> [args]",
    globalFlags: {
      "--base-url": "Override MERE_EMAIL_BASE_URL",
      "--token": "Override MERE_EMAIL_TOKEN",
      "--workspace": "Override MERE_EMAIL_WORKSPACE_ID",
      "--json": "Write machine-readable JSON",
      "--version": "Show the CLI version",
      "--no-interactive": "Do not attempt interactive prompts",
      "--yes": "Required for destructive automation",
      "--confirm": "Exact target required with --yes for destructive commands",
      "--help": "Show help"
    },
    commands: {
      completion: ["bash", "zsh", "fish"],
      auth: ["login", "whoami", "logout"],
      workspace: [
        "list",
        "current",
        "use",
        "bootstrap",
        "provision",
        "sync",
        "disconnect"
      ],
      mailboxes: ["list"],
      threads: ["search", "show", "read", "star", "archive"],
      drafts: ["create", "show", "discard"],
      attachments: ["list", "download"],
      domains: ["search", "register", "show"],
      send: "send outbound email, optionally with attachments",
      export: "export workspace data as JSON",
      import: ["start import from file", "status"],
      inbound: "simulate inbound mail ingress from file"
    },
    environment: {
      MERE_EMAIL_BASE_URL: "Base worker URL",
      MERE_EMAIL_TOKEN: "Bearer token override for internal/service access",
      MERE_EMAIL_WORKSPACE_ID: "Default ZeroSMB tenant / workspace id"
    },
    baseDomains: EMAIL_WORKSPACE_BASE_DOMAINS,
    lifecycleStates: EMAIL_WORKSPACE_LIFECYCLE_STATES
  };
}
function manifestCommand(path2, summary, options = {}) {
  return {
    id: path2.join("."),
    path: path2,
    summary,
    auth: options.auth ?? "workspace",
    risk: options.risk ?? "read",
    supportsJson: true,
    supportsData: options.supportsData ?? false,
    requiresYes: options.requiresYes ?? false,
    requiresConfirm: options.requiresConfirm ?? false,
    positionals: [],
    flags: [],
    ...options.auditDefault ? { auditDefault: true } : {}
  };
}
function commandManifest() {
  return {
    schemaVersion: 1,
    app: "mere-email",
    namespace: "email",
    aliases: ["mere-email", "zerodispatch"],
    auth: { kind: "browser" },
    baseUrlEnv: ["MERE_EMAIL_BASE_URL"],
    sessionPath: "~/.local/state/mere-email/session.json",
    globalFlags: ["base-url", "workspace", "json", "yes", "confirm", "data", "data-file"],
    commands: [
      manifestCommand(["auth", "login"], "Start browser login.", { auth: "none", risk: "write" }),
      manifestCommand(["auth", "whoami"], "Show current user and workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["auth", "logout"], "Clear the local session.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "list"], "List workspaces.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "current"], "Show current workspace.", { auth: "session", auditDefault: true }),
      manifestCommand(["workspace", "use"], "Select workspace.", { auth: "session", risk: "write" }),
      manifestCommand(["workspace", "bootstrap"], "Bootstrap workspace.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "provision"], "Provision workspace.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "sync"], "Sync workspace.", { risk: "write", supportsData: true }),
      manifestCommand(["workspace", "disconnect"], "Disconnect workspace.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["mailboxes", "list"], "List mailboxes.", { auditDefault: true }),
      manifestCommand(["threads", "search"], "Search threads."),
      manifestCommand(["threads", "show"], "Show thread."),
      manifestCommand(["threads", "read"], "Mark thread read.", { risk: "write" }),
      manifestCommand(["threads", "star"], "Star thread.", { risk: "write" }),
      manifestCommand(["threads", "archive"], "Archive thread.", { risk: "destructive", requiresYes: true }),
      manifestCommand(["drafts", "create"], "Create draft.", { risk: "write", supportsData: true }),
      manifestCommand(["drafts", "show"], "Show draft."),
      manifestCommand(["drafts", "discard"], "Discard draft.", { risk: "destructive", requiresYes: true, requiresConfirm: true }),
      manifestCommand(["attachments", "list"], "List attachments."),
      manifestCommand(["attachments", "download"], "Download attachment."),
      manifestCommand(["domains", "search"], "Search domains."),
      manifestCommand(["domains", "register"], "Register domain.", { risk: "external", supportsData: true, requiresYes: true }),
      manifestCommand(["domains", "show"], "Show domain registration."),
      manifestCommand(["send"], "Send email.", { risk: "external", supportsData: true, requiresYes: true }),
      manifestCommand(["export"], "Export workspace data."),
      manifestCommand(["import"], "Import workspace data.", { risk: "write", supportsData: true }),
      manifestCommand(["import", "status"], "Show import status."),
      manifestCommand(["inbound"], "Simulate inbound mail.", { risk: "write", supportsData: true }),
      manifestCommand(["completion"], "Generate shell completion.", { auth: "none" }),
      manifestCommand(["commands"], "Print command manifest.", { auth: "none" })
    ]
  };
}
async function cliVersion() {
  const raw = await readFile3(new URL("../package.json", import.meta.url), "utf8");
  const parsed = parseJsonText(raw);
  return parsed.version ?? "0.0.0";
}
var COMPLETION_WORDS = [
  "attachments",
  "auth",
  "completion",
  "domains",
  "drafts",
  "export",
  "import",
  "inbound",
  "mailboxes",
  "send",
  "threads",
  "workspace"
];
function completionScript(shell) {
  const normalized = (shell ?? "bash").trim().toLowerCase();
  if (normalized === "bash") {
    return [
      "# mere-email bash completion",
      "_mere_email_completion() {",
      '  local cur="${COMP_WORDS[COMP_CWORD]}"',
      `  COMPREPLY=( $(compgen -W "${COMPLETION_WORDS.join(" ")}" -- "$cur") )`,
      "}",
      "complete -F _mere_email_completion mere-email",
      ""
    ].join("\n");
  }
  if (normalized === "zsh") {
    return [
      "#compdef mere-email",
      "_mere_email() {",
      "  local -a commands",
      `  commands=(${COMPLETION_WORDS.map((word) => `"${word}:${word} commands"`).join(" ")})`,
      "  _describe 'command' commands",
      "}",
      '_mere_email "$@"',
      ""
    ].join("\n");
  }
  if (normalized === "fish") {
    return `${COMPLETION_WORDS.map((word) => `complete -c mere-email -f -n '__fish_use_subcommand' -a '${word}'`).join("\n")}
`;
  }
  throw new CliError("Unknown shell. Expected bash, zsh, or fish.");
}
function parseFlags(args, spec) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const expectedKind = spec[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown option: --${rawName}`);
    }
    if (expectedKind === "boolean") {
      if (inlineValue != null) {
        options[rawName] = inlineValue === "true";
      } else {
        options[rawName] = true;
      }
      continue;
    }
    const resolvedValue = inlineValue ?? (() => {
      const next = args[index + 1];
      if (!next || next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`);
      }
      index += 1;
      return next;
    })();
    if (expectedKind === "string[]") {
      const current = Array.isArray(options[rawName]) ? options[rawName] : [];
      options[rawName] = [...current, resolvedValue];
      continue;
    }
    options[rawName] = resolvedValue;
  }
  return { options, positionals };
}
function parseCommandFlags(args, spec) {
  return parseFlags(args, { ...spec, help: "boolean" });
}
function splitGlobalFlags(argv) {
  const globalTokens = [];
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (token === "-v") {
      globalTokens.push("--version");
      index += 1;
      continue;
    }
    if (!token.startsWith("--")) {
      break;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const expectedKind = GLOBAL_FLAG_SPEC[rawName];
    if (!expectedKind) {
      throw new CliError(`Unknown global option: --${rawName}`);
    }
    globalTokens.push(token);
    if (expectedKind !== "boolean" && inlineValue == null) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new CliError(`Missing value for --${rawName}.`);
      }
      globalTokens.push(next);
      index += 1;
    }
    index += 1;
  }
  return {
    options: parseFlags(globalTokens, GLOBAL_FLAG_SPEC).options,
    rest: argv.slice(index)
  };
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function asBoolean(value) {
  return value === true;
}
function trimOption(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function hasOption(options, name) {
  return Object.prototype.hasOwnProperty.call(options, name);
}
function readRequiredStringOption(options, name, label = `--${name}`) {
  const value = trimOption(asString(options[name]));
  if (!value) {
    throw new CliError(`Missing required ${label}.`);
  }
  return value;
}
function readOptionalStringOption(options, name) {
  return trimOption(asString(options[name]));
}
function requireDestructiveConfirmation(globalOptions, options, label, target) {
  if (!asBoolean(options.yes) && !asBoolean(globalOptions.yes)) {
    throw new CliError(`Refusing to ${label} ${target} without --yes.`, 2);
  }
  const confirm = readOptionalStringOption(options, "confirm") ?? readOptionalStringOption(globalOptions, "confirm");
  if (confirm !== target) {
    throw new CliError(`Refusing to ${label} ${target} without --confirm ${target}.`, 2);
  }
}
function readOptionalNullableStringOption(options, name) {
  if (!hasOption(options, name)) {
    return void 0;
  }
  const value = asString(options[name]);
  if (value == null) {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  return trimmed.toLowerCase() === "null" ? null : trimmed;
}
function parseIntegerOption(value, label, options = {}) {
  if (value == null) {
    return void 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new CliError(`${label} must be an integer.`);
  }
  if (options.min != null && parsed < options.min) {
    throw new CliError(`${label} must be >= ${options.min}.`);
  }
  if (options.max != null && parsed > options.max) {
    throw new CliError(`${label} must be <= ${options.max}.`);
  }
  return parsed;
}
function parseBaseDomain(value) {
  const normalized = value?.trim().toLowerCase() ?? DEFAULT_EMAIL_WORKSPACE_BASE_DOMAIN;
  if (!normalized || !normalized.includes(".")) {
    throw new CliError("--base-domain must be a valid domain (e.g., meresmb.com or sawfwair.com).");
  }
  return normalized;
}
function parseLifecycleState2(value) {
  if (!value) return void 0;
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_WORKSPACE_LIFECYCLE_STATES.includes(normalized)) {
    throw new CliError(
      `--lifecycle-state must be one of ${EMAIL_WORKSPACE_LIFECYCLE_STATES.join(", ")}.`
    );
  }
  return normalized;
}
function ensureUrl(value, label) {
  try {
    return new URL(value).toString();
  } catch {
    throw new CliError(`${label} must be a valid URL.`);
  }
}
function requireNoPositionals(positionals) {
  if (positionals.length > 0) {
    throw new CliError(`Unexpected arguments: ${positionals.join(" ")}`);
  }
}
function requireSinglePositional(positionals, label) {
  if (positionals.length !== 1) {
    throw new CliError(`Expected ${label}.`);
  }
  return positionals[0];
}
function resolveBaseUrl(options, env) {
  const baseUrl = trimOption(asString(options["base-url"])) ?? trimOption(env.MERE_EMAIL_BASE_URL) ?? activeSession?.baseUrl ?? "https://mere.email";
  if (!baseUrl) {
    throw new CliError("Missing base URL. Set MERE_EMAIL_BASE_URL or pass --base-url.");
  }
  return baseUrl;
}
function resolveToken(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_EMAIL_TOKEN) ?? activeSession?.accessToken;
}
function resolveExternalToken(options, env) {
  return trimOption(asString(options.token)) ?? trimOption(env.MERE_EMAIL_TOKEN);
}
function resolveWorkspaceOptional(options, env) {
  return trimOption(asString(options.workspace)) ?? trimOption(env.MERE_EMAIL_WORKSPACE_ID) ?? activeSession?.defaultWorkspaceId ?? void 0;
}
function resolveWorkspace(options, env) {
  const workspaceId = resolveWorkspaceOptional(options, env);
  if (!workspaceId) {
    throw new CliError(
      "Missing workspace ID. Set MERE_EMAIL_WORKSPACE_ID or pass --workspace."
    );
  }
  return workspaceId;
}
function createClient(io, options) {
  return new EmailCliClient({
    baseUrl: resolveBaseUrl(options, io.env),
    token: resolveToken(options, io.env),
    fetchImpl: io.fetchImpl
  });
}
function renderSessionSummary(session) {
  const workspaceLabel = session.workspaces.length > 0 ? session.workspaces.map(
    (workspace) => workspace.id === session.defaultWorkspaceId ? `${workspace.slug} (default)` : workspace.slug
  ).join(", ") : "none";
  return [
    `user: ${session.user.displayName || session.user.primaryEmail}`,
    `email: ${session.user.primaryEmail}`,
    `base url: ${session.baseUrl}`,
    `expires: ${session.expiresAt}`,
    `workspaces: ${workspaceLabel}`
  ].join("\n");
}
function renderWorkspaceLabel(workspace) {
  return `${workspace.name} (${workspace.slug}, ${workspace.host}, ${workspace.role})`;
}
function writeAuthSession(io, globalOptions, session) {
  if (asBoolean(globalOptions.json)) {
    writeJson(io, {
      user: session.user,
      baseUrl: session.baseUrl,
      expiresAt: session.expiresAt,
      defaultWorkspaceId: session.defaultWorkspaceId,
      workspaces: session.workspaces
    });
    return;
  }
  writeText(io, renderSessionSummary(session));
}
function writeJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}
`);
}
function writeText(io, value) {
  io.stdout(`${value}
`);
}
function writeHelp(io, json) {
  if (json) {
    writeJson(io, helpJson());
    return;
  }
  writeText(io, HELP_TEXT);
}
function writeResult(io, globalOptions, value, render) {
  if (asBoolean(globalOptions.json)) {
    writeJson(io, value);
    return;
  }
  writeText(io, render(value));
}
async function writeBytesFile(outputPath, bytes) {
  const target = resolvePath2(outputPath);
  await mkdir2(dirname(target), { recursive: true });
  await writeFile2(target, bytes);
  return target;
}
function pickWorkspaceSession(session, requestedWorkspace) {
  if (!requestedWorkspace?.trim()) {
    return session;
  }
  const normalized = requestedWorkspace.trim().toLowerCase();
  const match = session.workspaces.find(
    (workspace) => workspace.id.toLowerCase() === normalized || workspace.slug.toLowerCase() === normalized || workspace.host.toLowerCase() === normalized
  );
  if (!match) {
    return session;
  }
  return {
    ...session,
    defaultWorkspaceId: match.id
  };
}
async function readJsonFile(filePath) {
  const absolutePath = resolvePath2(filePath);
  let text;
  try {
    text = await readFile3(absolutePath, "utf8");
  } catch (error) {
    throw new CliError(
      `Failed to read ${absolutePath}: ${error instanceof Error ? error.message : "Unknown error."}`
    );
  }
  try {
    return parseJsonText(text, {
      invalidJsonMessage: `Invalid JSON in ${absolutePath}.`
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(error instanceof Error ? error.message : `Invalid JSON in ${absolutePath}.`);
  }
}
async function readStructuredInput(options, label) {
  const inline = readOptionalStringOption(options, "data");
  const file = readOptionalStringOption(options, "data-file");
  if (inline && file) {
    throw new CliError(`Pass either --data or --data-file for ${label}, not both.`);
  }
  if (inline) {
    return ensureRecord(
      parseJsonText(inline, { invalidJsonMessage: `Invalid JSON in --data for ${label}.` }),
      label
    );
  }
  if (file) {
    return ensureRecord(await readJsonFile(file), label);
  }
  return {};
}
function ensureRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError(`${label} must be a JSON object.`);
  }
  return value;
}
function readOptionalTrimmedString(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeInboundRequest(value, defaultWorkspaceId) {
  const record = ensureRecord(value, "Inbound payload");
  if (Object.prototype.hasOwnProperty.call(record, "payload")) {
    const payload = ensureRecord(record.payload, "Inbound payload.payload");
    const workspaceId = readOptionalTrimmedString(record.workspaceId) ?? defaultWorkspaceId;
    if (!workspaceId) {
      throw new CliError(
        "Inbound payload requires a workspace ID. Pass --workspace or include workspaceId in the file."
      );
    }
    const optionsValue = record.options;
    let normalizedOptions;
    if (optionsValue !== void 0) {
      const optionsRecord = ensureRecord(optionsValue, "Inbound payload.options");
      normalizedOptions = {
        webhookUrl: readOptionalTrimmedString(optionsRecord.webhookUrl),
        internalToken: readOptionalTrimmedString(optionsRecord.internalToken)
      };
    }
    return {
      scenarioId: readOptionalTrimmedString(record.scenarioId),
      workspaceId,
      fixtureId: readOptionalTrimmedString(record.fixtureId),
      payload,
      ...normalizedOptions ? { options: normalizedOptions } : {}
    };
  }
  if (!defaultWorkspaceId) {
    throw new CliError(
      "Inbound payload requires a workspace ID. Pass --workspace or use a wrapper file with workspaceId and payload."
    );
  }
  return {
    workspaceId: defaultWorkspaceId,
    payload: record
  };
}
async function handleWorkspaceBootstrap(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).workspaceBootstrap(workspaceId);
  writeResult(io, globalOptions, result, renderBootstrap);
}
async function handleWorkspaceProvision(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    slug: "string",
    "base-domain": "string",
    "mailbox-address": "string",
    name: "string",
    "organization-id": "string",
    "callback-url": "string",
    "callback-bearer-token": "string",
    "lifecycle-state": "string",
    "trial-ends-at": "string",
    "grace-ends-at": "string",
    "activated-at": "string",
    "deletion-scheduled-at": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const lifecycleState = parseLifecycleState2(readOptionalStringOption(options, "lifecycle-state"));
  const mailboxAddress = readOptionalStringOption(options, "mailbox-address");
  const input = {
    zerosmbTenantId: workspaceId,
    slug: readRequiredStringOption(options, "slug"),
    baseDomain: parseBaseDomain(readOptionalStringOption(options, "base-domain")),
    name: readRequiredStringOption(options, "name"),
    organizationId: readRequiredStringOption(options, "organization-id"),
    callbackUrl: ensureUrl(readRequiredStringOption(options, "callback-url"), "--callback-url"),
    callbackBearerToken: readRequiredStringOption(
      options,
      "callback-bearer-token",
      "--callback-bearer-token"
    ),
    ...mailboxAddress ? { mailboxAddress } : {},
    ...lifecycleState ? { lifecycleState } : {},
    ...readOptionalNullableStringOption(options, "trial-ends-at") !== void 0 ? { trialEndsAt: readOptionalNullableStringOption(options, "trial-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "grace-ends-at") !== void 0 ? { graceEndsAt: readOptionalNullableStringOption(options, "grace-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "activated-at") !== void 0 ? { activatedAt: readOptionalNullableStringOption(options, "activated-at") } : {},
    ...readOptionalNullableStringOption(options, "deletion-scheduled-at") !== void 0 ? {
      deletionScheduledAt: readOptionalNullableStringOption(
        options,
        "deletion-scheduled-at"
      )
    } : {}
  };
  const result = await createClient(io, globalOptions).provisionWorkspace(workspaceId, input);
  writeResult(io, globalOptions, result, renderWorkspaceLifecycle);
}
async function handleWorkspaceSync(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "lifecycle-state": "string",
    "trial-ends-at": "string",
    "grace-ends-at": "string",
    "activated-at": "string",
    "deletion-scheduled-at": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const lifecycleState = parseLifecycleState2(readOptionalStringOption(options, "lifecycle-state"));
  const input = {
    zerosmbTenantId: workspaceId,
    ...lifecycleState ? { lifecycleState } : {},
    ...readOptionalNullableStringOption(options, "trial-ends-at") !== void 0 ? { trialEndsAt: readOptionalNullableStringOption(options, "trial-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "grace-ends-at") !== void 0 ? { graceEndsAt: readOptionalNullableStringOption(options, "grace-ends-at") } : {},
    ...readOptionalNullableStringOption(options, "activated-at") !== void 0 ? { activatedAt: readOptionalNullableStringOption(options, "activated-at") } : {},
    ...readOptionalNullableStringOption(options, "deletion-scheduled-at") !== void 0 ? {
      deletionScheduledAt: readOptionalNullableStringOption(
        options,
        "deletion-scheduled-at"
      )
    } : {}
  };
  const result = await createClient(io, globalOptions).syncWorkspace(workspaceId, input);
  writeResult(io, globalOptions, result, renderWorkspaceLifecycle);
}
async function handleWorkspaceDisconnect(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  requireDestructiveConfirmation(globalOptions, options, "disconnect workspace", workspaceId);
  const result = await createClient(io, globalOptions).disconnectWorkspace(workspaceId);
  writeResult(io, globalOptions, result, renderDisconnectResult);
}
async function handleWorkspaceCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing workspace command. Expected list, current, use, bootstrap, provision, sync, or disconnect.");
  }
  switch (action) {
    case "list": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      requireNoPositionals(positionals);
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      writeResult(
        io,
        globalOptions,
        session.workspaces,
        (workspaces) => workspaces.length > 0 ? workspaces.map((workspace) => renderWorkspaceLabel(workspace)).join("\n") : "No workspaces available."
      );
      return;
    }
    case "current": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      requireNoPositionals(positionals);
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      const defaultWorkspace = session.workspaces.find((workspace) => workspace.id === session.defaultWorkspaceId) ?? null;
      writeResult(io, globalOptions, { current: session.workspace, defaultWorkspace }, (value) => {
        const current = value.current ? renderWorkspaceLabel(value.current) : "none";
        const defaultLabel = value.defaultWorkspace ? renderWorkspaceLabel(value.defaultWorkspace) : "none";
        return [`current: ${current}`, `default: ${defaultLabel}`].join("\n");
      });
      return;
    }
    case "use": {
      const { options, positionals } = parseCommandFlags(args, {});
      if (asBoolean(options.help)) {
        writeHelp(io, asBoolean(globalOptions.json));
        return;
      }
      const selector = requireSinglePositional(positionals, "<id|slug|host>");
      const session = activeSession ?? await loadSession(io.env);
      if (!session) {
        throw new CliError("No local session found. Run `mere-email auth login` first.");
      }
      const target = requireWorkspaceSelection(session.workspaces, selector);
      const refreshed = await refreshRemoteSession2(session, {
        workspace: target.id,
        fetchImpl: io.fetchImpl,
        persistDefaultWorkspace: true
      });
      await saveSession(refreshed, io.env);
      activeSession = refreshed;
      writeAuthSession(io, globalOptions, refreshed);
      return;
    }
    case "bootstrap":
      await handleWorkspaceBootstrap(io, globalOptions, args);
      return;
    case "provision":
      await handleWorkspaceProvision(io, globalOptions, args);
      return;
    case "sync":
      await handleWorkspaceSync(io, globalOptions, args);
      return;
    case "disconnect":
      await handleWorkspaceDisconnect(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown workspace command. Expected list, current, use, bootstrap, provision, sync, or disconnect.");
  }
}
async function handleAuthLogin(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const session = pickWorkspaceSession(
    await loginWithBrowser2({
      baseUrl: resolveBaseUrl(globalOptions, io.env),
      workspace: resolveWorkspaceOptional(globalOptions, io.env),
      fetchImpl: io.fetchImpl,
      notify: (message) => {
        io.stderr(`${message}
`);
      },
      env: io.env
    }),
    resolveWorkspaceOptional(globalOptions, io.env)
  );
  await saveSession(session, io.env);
  activeSession = session;
  writeAuthSession(io, globalOptions, session);
}
async function handleAuthWhoami(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const session = activeSession ?? await loadSession(io.env);
  if (!session) {
    throw new CliError("No local session found. Run `mere-email auth login` first.");
  }
  activeSession = session;
  writeAuthSession(io, globalOptions, session);
}
async function handleAuthLogout(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const loggedOut = await logoutRemote({
    fetchImpl: io.fetchImpl,
    env: io.env
  });
  activeSession = null;
  if (asBoolean(globalOptions.json)) {
    writeJson(io, { loggedOut });
    return;
  }
  writeText(io, loggedOut ? "Logged out." : "No local session found.");
}
async function handleAuthCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Unknown auth command. Expected login, whoami, or logout.");
  }
  switch (action) {
    case "login":
      await handleAuthLogin(io, globalOptions, args);
      return;
    case "whoami":
      await handleAuthWhoami(io, globalOptions, args);
      return;
    case "logout":
      await handleAuthLogout(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown auth command. Expected login, whoami, or logout.");
  }
}
async function handleMailboxesList(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).listMailboxes(workspaceId);
  writeResult(io, globalOptions, result, renderMailboxes);
}
async function handleMailboxesCommand(io, globalOptions, action, args) {
  if (action !== "list") {
    throw new CliError("Unknown mailboxes command. Expected list.");
  }
  await handleMailboxesList(io, globalOptions, args);
}
async function handleThreadsSearch(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    limit: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const query = positionals.join(" ").trim();
  if (!query) {
    throw new CliError("threads search requires a query.");
  }
  const limit = parseIntegerOption(readOptionalStringOption(options, "limit"), "--limit", {
    min: 1,
    max: 25
  });
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).searchThreads(workspaceId, {
    query,
    ...limit != null ? { limit } : {}
  });
  writeResult(io, globalOptions, result, renderSearchResults);
}
async function handleThreadsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).showThread(workspaceId, threadId);
  writeResult(io, globalOptions, result, renderThread);
}
async function handleThreadsAction(io, globalOptions, args, action) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  if (action === "archive") {
    requireDestructiveConfirmation(globalOptions, options, "archive thread", threadId);
  }
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).actOnThread(workspaceId, threadId, action);
  writeResult(io, globalOptions, result, (value) => renderThreadAction(action, value));
}
async function handleThreadsCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing threads command. Expected search, show, read, star, or archive.");
  }
  switch (action) {
    case "search":
      await handleThreadsSearch(io, globalOptions, args);
      return;
    case "show":
      await handleThreadsShow(io, globalOptions, args);
      return;
    case "read":
      await handleThreadsAction(io, globalOptions, args, "mark_read");
      return;
    case "star":
      await handleThreadsAction(io, globalOptions, args, "star");
      return;
    case "archive":
      await handleThreadsAction(io, globalOptions, args, "archive");
      return;
    default:
      throw new CliError("Unknown threads command. Expected search, show, read, star, or archive.");
  }
}
async function handleAttachmentsList(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const threadId = requireSinglePositional(positionals, "<thread-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const thread = await createClient(io, globalOptions).showThread(workspaceId, threadId);
  const attachments = thread.messages.flatMap(
    (message) => message.attachments.map((attachment) => ({
      ...attachment,
      threadId,
      messageId: message.id
    }))
  );
  writeResult(
    io,
    globalOptions,
    { threadId, attachments },
    (value) => {
      if (value.attachments.length === 0) return "No attachments.";
      return value.attachments.map((attachment) => `${attachment.id}	${attachment.filename}	${attachment.sizeBytes} bytes`).join("\n");
    }
  );
}
async function handleAttachmentsDownload(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    output: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const attachmentId = requireSinglePositional(positionals, "<attachment-id>");
  const outputPath = readRequiredStringOption(options, "output");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const download = await createClient(io, globalOptions).downloadAttachment(workspaceId, attachmentId);
  const path2 = await writeBytesFile(outputPath, download.bytes);
  writeResult(
    io,
    globalOptions,
    {
      attachmentId,
      path: path2,
      filename: download.filename,
      contentType: download.contentType,
      bytes: download.bytes.byteLength
    },
    (value) => `Saved ${value.filename ?? attachmentId} (${value.bytes} bytes) to ${value.path}`
  );
}
async function handleAttachmentsCommand(io, globalOptions, action, args) {
  if (!action) {
    throw new CliError("Missing attachments command. Expected list or download.");
  }
  switch (action) {
    case "list":
      await handleAttachmentsList(io, globalOptions, args);
      return;
    case "download":
      await handleAttachmentsDownload(io, globalOptions, args);
      return;
    default:
      throw new CliError("Unknown attachments command. Expected list or download.");
  }
}
async function handleDraftsCreate(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    data: "string",
    "data-file": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const input = await readStructuredInput(options, "draft payload");
  const result = await createClient(io, globalOptions).createDraft(workspaceId, input);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const draftId = requireSinglePositional(positionals, "<draft-id>");
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).showDraft(workspaceId, draftId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsDiscard(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    yes: "boolean",
    confirm: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const draftId = requireSinglePositional(positionals, "<draft-id>");
  requireDestructiveConfirmation(globalOptions, options, "discard draft", draftId);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).discardDraft(workspaceId, draftId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDraftsCommand(io, globalOptions, action, args) {
  switch (action) {
    case "create":
      await handleDraftsCreate(io, globalOptions, args);
      return;
    case "show":
      await handleDraftsShow(io, globalOptions, args);
      return;
    case "discard":
      await handleDraftsDiscard(io, globalOptions, args);
      return;
    case void 0:
    default:
      throw new CliError("Unknown drafts command. Expected create, show, or discard.");
  }
}
async function handleDomainsSearch(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const domain = requireSinglePositional(positionals, "<domain>");
  const result = await createClient(io, globalOptions).searchDomain(domain);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsRegister(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    data: "string",
    "data-file": "string",
    domain: "string",
    "organization-id": "string",
    period: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const payload = await readStructuredInput(options, "domain registration payload");
  const domain = readOptionalStringOption(options, "domain");
  const organizationId = readOptionalStringOption(options, "organization-id");
  const period = parseIntegerOption(readOptionalStringOption(options, "period"), "--period", {
    min: 1,
    max: 10
  });
  const result = await createClient(io, globalOptions).registerDomain({
    ...payload,
    workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : workspaceId,
    ...domain ? { domain } : {},
    ...organizationId ? { organizationId } : {},
    ...period != null ? { period } : {}
  });
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsShow(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  const registrationId = requireSinglePositional(positionals, "<registration-id>");
  const result = await createClient(io, globalOptions).showDomainRegistration(registrationId);
  writeResult(io, globalOptions, result, (value) => JSON.stringify(value, null, 2));
}
async function handleDomainsCommand(io, globalOptions, action, args) {
  switch (action) {
    case "search":
      await handleDomainsSearch(io, globalOptions, args);
      return;
    case "register":
      await handleDomainsRegister(io, globalOptions, args);
      return;
    case "show":
      await handleDomainsShow(io, globalOptions, args);
      return;
    case void 0:
    default:
      throw new CliError("Unknown domains command. Expected search, register, or show.");
  }
}
async function handleSend(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    to: "string[]",
    cc: "string[]",
    bcc: "string[]",
    attach: "string[]",
    "mailbox-id": "string",
    "from-name": "string",
    "reply-thread-id": "string",
    subject: "string",
    body: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const to = asStringArray(options.to).map((entry) => entry.trim()).filter(Boolean);
  if (to.length === 0) {
    throw new CliError("send requires at least one --to address.");
  }
  const input = await buildSendInputFromCliOptions({
    to,
    cc: asStringArray(options.cc).map((entry) => entry.trim()).filter(Boolean),
    bcc: asStringArray(options.bcc).map((entry) => entry.trim()).filter(Boolean),
    subject: readRequiredStringOption(options, "subject"),
    bodyText: readOptionalStringOption(options, "body") ?? "",
    attachPaths: asStringArray(options.attach).map((entry) => entry.trim()).filter(Boolean),
    mailboxId: readOptionalStringOption(options, "mailbox-id"),
    fromName: readOptionalStringOption(options, "from-name"),
    replyThreadId: readOptionalStringOption(options, "reply-thread-id")
  });
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).send(workspaceId, input);
  writeResult(io, globalOptions, result, renderSendResult);
}
async function handleExport(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {});
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).exportWorkspace(workspaceId);
  writeJson(io, result);
}
async function handleImport(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    file: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const rawPayload = await readJsonFile(readRequiredStringOption(options, "file"));
  const payload = parseJsonWithSchema(
    EmailWorkspaceImportRequestSchema,
    rawPayload,
    { invalidBodyMessage: "Import payload is invalid." }
  );
  if (payload.zerosmbTenantId !== workspaceId) {
    throw new CliError(
      `Import payload tenant ${payload.zerosmbTenantId} does not match workspace ${workspaceId}.`
    );
  }
  const result = await createClient(io, globalOptions).importWorkspace(
    workspaceId,
    payload
  );
  writeResult(io, globalOptions, result, renderImportStatus);
}
async function handleImportStatus(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    "run-id": "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const workspaceId = resolveWorkspace(globalOptions, io.env);
  const result = await createClient(io, globalOptions).importStatus(
    workspaceId,
    readOptionalStringOption(options, "run-id")
  );
  writeResult(io, globalOptions, result, renderImportStatus);
}
async function handleImportCommand(io, globalOptions, action, args) {
  if (action === "status") {
    await handleImportStatus(io, globalOptions, args);
    return;
  }
  const commandArgs = action == null ? args : [action, ...args];
  await handleImport(io, globalOptions, commandArgs);
}
async function handleInbound(io, globalOptions, args) {
  const { options, positionals } = parseCommandFlags(args, {
    file: "string"
  });
  if (asBoolean(options.help)) {
    writeHelp(io, asBoolean(globalOptions.json));
    return;
  }
  requireNoPositionals(positionals);
  const rawPayload = await readJsonFile(readRequiredStringOption(options, "file"));
  const payload = normalizeInboundRequest(
    rawPayload,
    resolveWorkspaceOptional(globalOptions, io.env)
  );
  const result = await createClient(io, globalOptions).simulateInbound(payload);
  writeResult(io, globalOptions, result, renderInboundResult);
}
async function runCli(argv, io) {
  try {
    const { options: globalOptions, rest } = splitGlobalFlags(argv);
    if (asBoolean(globalOptions.version)) {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest[0] === "version") {
      writeText(io, await cliVersion());
      return 0;
    }
    if (rest[0] === "completion") {
      writeText(io, completionScript(rest[1]));
      return 0;
    }
    if (rest[0] === "commands") {
      writeJson(io, commandManifest());
      return 0;
    }
    if (asBoolean(globalOptions.help) || rest.length === 0 || rest[0] === "help") {
      writeHelp(io, asBoolean(globalOptions.json));
      return 0;
    }
    activeSession = await loadSession(io.env);
    const [group, action, ...remaining] = rest;
    const isWorkspaceMetadataCommand = group === "workspace" && ["list", "current", "use"].includes(action ?? "");
    if (group !== "auth" && !isWorkspaceMetadataCommand && activeSession && !resolveExternalToken(globalOptions, io.env)) {
      activeSession = await ensureWorkspaceSession(activeSession, {
        workspace: resolveWorkspaceOptional(globalOptions, io.env),
        fetchImpl: io.fetchImpl
      });
      await saveSession(activeSession, io.env);
    }
    switch (group) {
      case "auth":
        await handleAuthCommand(io, globalOptions, action, remaining);
        break;
      case "workspace":
        await handleWorkspaceCommand(io, globalOptions, action, remaining);
        break;
      case "mailboxes":
        await handleMailboxesCommand(io, globalOptions, action, remaining);
        break;
      case "threads":
        await handleThreadsCommand(io, globalOptions, action, remaining);
        break;
      case "attachments":
        await handleAttachmentsCommand(io, globalOptions, action, remaining);
        break;
      case "drafts":
        await handleDraftsCommand(io, globalOptions, action, remaining);
        break;
      case "domains":
        await handleDomainsCommand(io, globalOptions, action, remaining);
        break;
      case "send":
        await handleSend(io, globalOptions, rest.slice(1));
        break;
      case "export":
        await handleExport(io, globalOptions, rest.slice(1));
        break;
      case "import":
        await handleImportCommand(io, globalOptions, action, remaining);
        break;
      case "inbound":
        await handleInbound(io, globalOptions, rest.slice(1));
        break;
      default:
        throw new CliError(`Unknown command: ${group}`);
    }
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      io.stderr(`${error.message}
`);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : "Unexpected CLI error.";
    io.stderr(`${message}
`);
    return 1;
  }
}

// cli/run.ts
var exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  fetchImpl: fetch,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
});
process.exitCode = exitCode;
