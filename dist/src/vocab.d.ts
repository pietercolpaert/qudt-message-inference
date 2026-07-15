export declare const RDF: {
    readonly type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    readonly first: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
    readonly rest: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
    readonly nil: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";
};
export declare const XSD: {
    readonly decimal: "http://www.w3.org/2001/XMLSchema#decimal";
    readonly double: "http://www.w3.org/2001/XMLSchema#double";
    readonly float: "http://www.w3.org/2001/XMLSchema#float";
    readonly integer: "http://www.w3.org/2001/XMLSchema#integer";
    readonly int: "http://www.w3.org/2001/XMLSchema#int";
    readonly long: "http://www.w3.org/2001/XMLSchema#long";
    readonly short: "http://www.w3.org/2001/XMLSchema#short";
    readonly byte: "http://www.w3.org/2001/XMLSchema#byte";
    readonly nonNegativeInteger: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger";
    readonly positiveInteger: "http://www.w3.org/2001/XMLSchema#positiveInteger";
    readonly nonPositiveInteger: "http://www.w3.org/2001/XMLSchema#nonPositiveInteger";
    readonly negativeInteger: "http://www.w3.org/2001/XMLSchema#negativeInteger";
    readonly unsignedLong: "http://www.w3.org/2001/XMLSchema#unsignedLong";
    readonly unsignedInt: "http://www.w3.org/2001/XMLSchema#unsignedInt";
    readonly unsignedShort: "http://www.w3.org/2001/XMLSchema#unsignedShort";
    readonly unsignedByte: "http://www.w3.org/2001/XMLSchema#unsignedByte";
};
export declare const SH: {
    readonly NodeShape: "http://www.w3.org/ns/shacl#NodeShape";
    readonly PropertyShape: "http://www.w3.org/ns/shacl#PropertyShape";
    readonly targetClass: "http://www.w3.org/ns/shacl#targetClass";
    readonly property: "http://www.w3.org/ns/shacl#property";
    readonly path: "http://www.w3.org/ns/shacl#path";
    readonly node: "http://www.w3.org/ns/shacl#node";
    readonly datatype: "http://www.w3.org/ns/shacl#datatype";
    readonly unit: "http://www.w3.org/ns/shacl#unit";
    readonly in: "http://www.w3.org/ns/shacl#in";
    readonly hasValue: "http://www.w3.org/ns/shacl#hasValue";
};
export declare const QUDT: {
    readonly Unit: "http://qudt.org/schema/qudt/Unit";
    readonly QuantityValue: "http://qudt.org/schema/qudt/QuantityValue";
    readonly numericValue: "http://qudt.org/schema/qudt/numericValue";
    readonly unit: "http://qudt.org/schema/qudt/unit";
    readonly conversionMultiplier: "http://qudt.org/schema/qudt/conversionMultiplier";
    readonly conversionOffset: "http://qudt.org/schema/qudt/conversionOffset";
    readonly hasDimensionVector: "http://qudt.org/schema/qudt/hasDimensionVector";
    readonly symbol: "http://qudt.org/schema/qudt/symbol";
    readonly ucumCode: "http://qudt.org/schema/qudt/ucumCode";
};
export declare const CDT: {
    readonly namespace: "http://w3id.org/lindt/custom_datatypes#";
    readonly shortNamespace: "https://w3id.org/cdt/";
    readonly ucum: "http://w3id.org/lindt/custom_datatypes#ucum";
    readonly speed: "http://w3id.org/lindt/custom_datatypes#speed";
    readonly shortUcum: "https://w3id.org/cdt/ucum";
    readonly shortSpeed: "https://w3id.org/cdt/speed";
    readonly supported: Set<string>;
};
export declare const PROV: {
    readonly wasDerivedFrom: "http://www.w3.org/ns/prov#wasDerivedFrom";
};
export declare const QCR: {
    readonly namespace: "https://w3id.org/qudt-inference#";
    readonly effectiveConversionMultiplier: "https://w3id.org/qudt-inference#effectiveConversionMultiplier";
    readonly effectiveConversionOffset: "https://w3id.org/qudt-inference#effectiveConversionOffset";
    readonly convertedValue: "https://w3id.org/qudt-inference#convertedValue";
    readonly convertedNumericValue: "https://w3id.org/qudt-inference#convertedNumericValue";
    readonly parsedCdtValue: "https://w3id.org/qudt-inference#parsedCdtValue";
    readonly parsedSourceLiteral: "https://w3id.org/qudt-inference#parsedSourceLiteral";
    readonly parsedSourceValue: "https://w3id.org/qudt-inference#parsedSourceValue";
    readonly parsedSourceUnit: "https://w3id.org/qudt-inference#parsedSourceUnit";
    readonly recognizedUcumCode: "https://w3id.org/qudt-inference#recognizedUcumCode";
    readonly allowedCdtSourceUnit: "https://w3id.org/qudt-inference#allowedCdtSourceUnit";
    readonly supportedCdtDatatype: "https://w3id.org/qudt-inference#supportedCdtDatatype";
    readonly convertedFromUnit: "https://w3id.org/qudt-inference#convertedFromUnit";
    readonly convertedToUnit: "https://w3id.org/qudt-inference#convertedToUnit";
    readonly conversionProfile: "https://w3id.org/qudt-inference#conversionProfile";
    readonly affineQudtProfile: "https://w3id.org/qudt-inference#QudtAffineConversionProfile";
};
export declare const NUMERIC_DATATYPES: Set<string>;
//# sourceMappingURL=vocab.d.ts.map