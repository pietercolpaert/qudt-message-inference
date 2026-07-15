export const RDF = {
  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  first: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
  rest: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
  nil: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
} as const;

export const XSD = {
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
} as const;

export const SH = {
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
} as const;

export const QUDT = {
  Unit: 'http://qudt.org/schema/qudt/Unit',
  QuantityValue: 'http://qudt.org/schema/qudt/QuantityValue',
  numericValue: 'http://qudt.org/schema/qudt/numericValue',
  unit: 'http://qudt.org/schema/qudt/unit',
  conversionMultiplier: 'http://qudt.org/schema/qudt/conversionMultiplier',
  conversionOffset: 'http://qudt.org/schema/qudt/conversionOffset',
  hasDimensionVector: 'http://qudt.org/schema/qudt/hasDimensionVector',
  symbol: 'http://qudt.org/schema/qudt/symbol',
  ucumCode: 'http://qudt.org/schema/qudt/ucumCode',
} as const;

export const CDT_QUANTITY_DATATYPE_NAMES = [
  'ucum',
  'acceleration',
  'amountOfSubstance',
  'angle',
  'area',
  'catalyticActivity',
  'dimensionless',
  'electricCapacitance',
  'electricCharge',
  'electricConductance',
  'electricCurrent',
  'electricInductance',
  'electricPotential',
  'electricResistance',
  'energy',
  'force',
  'frequency',
  'illuminance',
  'length',
  'luminousFlux',
  'luminousIntensity',
  'magneticFlux',
  'magneticFluxDensity',
  'mass',
  'power',
  'pressure',
  'radiationDoseAbsorbed',
  'radiationDoseEffective',
  'radioactivity',
  'solidAngle',
  'speed',
  'temperature',
  'time',
  'volume',
] as const;

const CDT_NAMESPACE = 'http://w3id.org/lindt/custom_datatypes#';
const CDT_SHORT_NAMESPACE = 'https://w3id.org/cdt/';

export const CDT = {
  namespace: CDT_NAMESPACE,
  shortNamespace: CDT_SHORT_NAMESPACE,
  ucum: `${CDT_NAMESPACE}ucum`,
  speed: `${CDT_NAMESPACE}speed`,
  shortUcum: `${CDT_SHORT_NAMESPACE}ucum`,
  shortSpeed: `${CDT_SHORT_NAMESPACE}speed`,
  quantityDatatypeNames: CDT_QUANTITY_DATATYPE_NAMES,
  supported: new Set(
    [CDT_NAMESPACE, CDT_SHORT_NAMESPACE].flatMap((namespace) =>
      CDT_QUANTITY_DATATYPE_NAMES.map((name) => `${namespace}${name}`),
    ),
  ),
} as const;

export const PROV = {
  wasDerivedFrom: 'http://www.w3.org/ns/prov#wasDerivedFrom',
} as const;

export const QCR = {
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
} as const;

export const NUMERIC_DATATYPES = new Set<string>(Object.values(XSD));
