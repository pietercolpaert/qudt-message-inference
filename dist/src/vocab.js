"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMERIC_DATATYPES = exports.QCR = exports.PROV = exports.CDT = exports.QUDT = exports.SH = exports.XSD = exports.RDF = void 0;
exports.RDF = {
    type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    first: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
    rest: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
    nil: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
};
exports.XSD = {
    decimal: 'http://www.w3.org/2001/XMLSchema#decimal',
    double: 'http://www.w3.org/2001/XMLSchema#double',
    float: 'http://www.w3.org/2001/XMLSchema#float',
    integer: 'http://www.w3.org/2001/XMLSchema#integer',
    int: 'http://www.w3.org/2001/XMLSchema#int',
    long: 'http://www.w3.org/2001/XMLSchema#long',
    short: 'http://www.w3.org/2001/XMLSchema#short',
    byte: 'http://www.w3.org/2001/XMLSchema#byte',
    nonNegativeInteger: 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
    positiveInteger: 'http://www.w3.org/2001/XMLSchema#positiveInteger',
    nonPositiveInteger: 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
    negativeInteger: 'http://www.w3.org/2001/XMLSchema#negativeInteger',
    unsignedLong: 'http://www.w3.org/2001/XMLSchema#unsignedLong',
    unsignedInt: 'http://www.w3.org/2001/XMLSchema#unsignedInt',
    unsignedShort: 'http://www.w3.org/2001/XMLSchema#unsignedShort',
    unsignedByte: 'http://www.w3.org/2001/XMLSchema#unsignedByte',
};
exports.SH = {
    NodeShape: 'http://www.w3.org/ns/shacl#NodeShape',
    PropertyShape: 'http://www.w3.org/ns/shacl#PropertyShape',
    targetClass: 'http://www.w3.org/ns/shacl#targetClass',
    property: 'http://www.w3.org/ns/shacl#property',
    path: 'http://www.w3.org/ns/shacl#path',
    node: 'http://www.w3.org/ns/shacl#node',
    datatype: 'http://www.w3.org/ns/shacl#datatype',
    unit: 'http://www.w3.org/ns/shacl#unit',
    in: 'http://www.w3.org/ns/shacl#in',
    hasValue: 'http://www.w3.org/ns/shacl#hasValue',
};
exports.QUDT = {
    Unit: 'http://qudt.org/schema/qudt/Unit',
    QuantityValue: 'http://qudt.org/schema/qudt/QuantityValue',
    numericValue: 'http://qudt.org/schema/qudt/numericValue',
    unit: 'http://qudt.org/schema/qudt/unit',
    conversionMultiplier: 'http://qudt.org/schema/qudt/conversionMultiplier',
    conversionOffset: 'http://qudt.org/schema/qudt/conversionOffset',
    hasDimensionVector: 'http://qudt.org/schema/qudt/hasDimensionVector',
    symbol: 'http://qudt.org/schema/qudt/symbol',
    ucumCode: 'http://qudt.org/schema/qudt/ucumCode',
};
exports.CDT = {
    namespace: 'http://w3id.org/lindt/custom_datatypes#',
    shortNamespace: 'https://w3id.org/cdt/',
    ucum: 'http://w3id.org/lindt/custom_datatypes#ucum',
    speed: 'http://w3id.org/lindt/custom_datatypes#speed',
    shortUcum: 'https://w3id.org/cdt/ucum',
    shortSpeed: 'https://w3id.org/cdt/speed',
    supported: new Set([
        'http://w3id.org/lindt/custom_datatypes#ucum',
        'http://w3id.org/lindt/custom_datatypes#speed',
        'https://w3id.org/cdt/ucum',
        'https://w3id.org/cdt/speed',
    ]),
};
exports.PROV = {
    wasDerivedFrom: 'http://www.w3.org/ns/prov#wasDerivedFrom',
};
exports.QCR = {
    namespace: 'https://w3id.org/qudt-inference#',
    effectiveConversionMultiplier: 'https://w3id.org/qudt-inference#effectiveConversionMultiplier',
    effectiveConversionOffset: 'https://w3id.org/qudt-inference#effectiveConversionOffset',
    convertedValue: 'https://w3id.org/qudt-inference#convertedValue',
    convertedNumericValue: 'https://w3id.org/qudt-inference#convertedNumericValue',
    parsedCdtValue: 'https://w3id.org/qudt-inference#parsedCdtValue',
    parsedSourceLiteral: 'https://w3id.org/qudt-inference#parsedSourceLiteral',
    parsedSourceValue: 'https://w3id.org/qudt-inference#parsedSourceValue',
    parsedSourceUnit: 'https://w3id.org/qudt-inference#parsedSourceUnit',
    recognizedUcumCode: 'https://w3id.org/qudt-inference#recognizedUcumCode',
    allowedCdtSourceUnit: 'https://w3id.org/qudt-inference#allowedCdtSourceUnit',
    supportedCdtDatatype: 'https://w3id.org/qudt-inference#supportedCdtDatatype',
    convertedFromUnit: 'https://w3id.org/qudt-inference#convertedFromUnit',
    convertedToUnit: 'https://w3id.org/qudt-inference#convertedToUnit',
    conversionProfile: 'https://w3id.org/qudt-inference#conversionProfile',
    affineQudtProfile: 'https://w3id.org/qudt-inference#QudtAffineConversionProfile',
};
exports.NUMERIC_DATATYPES = new Set(Object.values(exports.XSD));
//# sourceMappingURL=vocab.js.map