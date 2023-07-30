/**
 * Vue Currency Input 3.0.5
 * (c) 2018-2023 Matthias Stiller
 * @license MIT
 */
import { ref, getCurrentInstance, version, computed, watch } from 'vue';

var CurrencyDisplay;
(function (CurrencyDisplay) {
    CurrencyDisplay["symbol"] = "symbol";
    CurrencyDisplay["narrowSymbol"] = "narrowSymbol";
    CurrencyDisplay["code"] = "code";
    CurrencyDisplay["name"] = "name";
    CurrencyDisplay["hidden"] = "hidden";
})(CurrencyDisplay || (CurrencyDisplay = {}));
var ValueScaling;
(function (ValueScaling) {
    ValueScaling["precision"] = "precision";
    ValueScaling["thousands"] = "thousands";
    ValueScaling["millions"] = "millions";
    ValueScaling["billions"] = "billions";
})(ValueScaling || (ValueScaling = {}));

const escapeRegExp = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
const removeLeadingZeros = (str) => {
    return str.replace(/^0+(0$|[^0])/, '$1');
};
const count = (str, search) => {
    return (str.match(new RegExp(escapeRegExp(search), 'g')) || []).length;
};
const substringBefore = (str, search) => {
    return str.substring(0, str.indexOf(search));
};

const DECIMAL_SEPARATORS = [',', '.', '٫'];
const INTEGER_PATTERN = '(0|[1-9]\\d*)';
class CurrencyFormat {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f;
        const { currency, currencyDisplay, locale, precision, accountingSign, useGrouping } = options;
        this.locale = locale;
        this.options = {
            currency,
            useGrouping,
            style: 'currency',
            currencySign: accountingSign ? 'accounting' : undefined,
            currencyDisplay: currencyDisplay !== CurrencyDisplay.hidden ? currencyDisplay : undefined
        };
        const numberFormat = new Intl.NumberFormat(locale, this.options);
        const formatParts = numberFormat.formatToParts(123456);
        this.currency = (_a = formatParts.find(({ type }) => type === 'currency')) === null || _a === void 0 ? void 0 : _a.value;
        this.digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => i.toLocaleString(locale));
        this.decimalSymbol = (_b = formatParts.find(({ type }) => type === 'decimal')) === null || _b === void 0 ? void 0 : _b.value;
        this.groupingSymbol = (_c = formatParts.find(({ type }) => type === 'group')) === null || _c === void 0 ? void 0 : _c.value;
        this.minusSign = (_d = numberFormat.formatToParts(-1).find(({ type }) => type === 'minusSign')) === null || _d === void 0 ? void 0 : _d.value;
        if (this.decimalSymbol === undefined) {
            this.minimumFractionDigits = this.maximumFractionDigits = 0;
        }
        else if (typeof precision === 'number') {
            this.minimumFractionDigits = this.maximumFractionDigits = precision;
        }
        else {
            this.minimumFractionDigits = (_e = precision === null || precision === void 0 ? void 0 : precision.min) !== null && _e !== void 0 ? _e : numberFormat.resolvedOptions().minimumFractionDigits;
            this.maximumFractionDigits = (_f = precision === null || precision === void 0 ? void 0 : precision.max) !== null && _f !== void 0 ? _f : numberFormat.resolvedOptions().maximumFractionDigits;
        }
        const getPrefix = (str) => {
            return substringBefore(str, this.digits[1]);
        };
        const getSuffix = (str) => {
            return str.substring(str.lastIndexOf(this.decimalSymbol ? this.digits[0] : this.digits[1]) + 1);
        };
        this.prefix = getPrefix(numberFormat.format(1));
        this.suffix = getSuffix(numberFormat.format(1));
        this.negativePrefix = getPrefix(numberFormat.format(-1));
        this.negativeSuffix = getSuffix(numberFormat.format(-1));
    }
    parse(str) {
        if (str) {
            const negative = this.isNegative(str);
            str = this.normalizeDigits(str);
            str = this.stripCurrency(str, negative);
            str = this.stripSignLiterals(str);
            const fraction = this.decimalSymbol ? `(?:${escapeRegExp(this.decimalSymbol)}(\\d*))?` : '';
            const match = this.stripGroupingSeparator(str).match(new RegExp(`^${INTEGER_PATTERN}${fraction}$`));
            if (match && this.isValidIntegerFormat(this.decimalSymbol ? str.split(this.decimalSymbol)[0] : str, Number(match[1]))) {
                return Number(`${negative ? '-' : ''}${this.onlyDigits(match[1])}.${this.onlyDigits(match[2] || '')}`);
            }
        }
        return null;
    }
    isValidIntegerFormat(formattedNumber, integerNumber) {
        const options = { ...this.options, minimumFractionDigits: 0 };
        return [
            this.stripCurrency(this.normalizeDigits(integerNumber.toLocaleString(this.locale, { ...options, useGrouping: true })), false),
            this.stripCurrency(this.normalizeDigits(integerNumber.toLocaleString(this.locale, { ...options, useGrouping: false })), false)
        ].includes(formattedNumber);
    }
    format(value, options = {
        minimumFractionDigits: this.minimumFractionDigits,
        maximumFractionDigits: this.maximumFractionDigits
    }) {
        return value != null ? value.toLocaleString(this.locale, { ...this.options, ...options }) : '';
    }
    toFraction(str) {
        return `${this.digits[0]}${this.decimalSymbol}${this.onlyLocaleDigits(str.substr(1)).substr(0, this.maximumFractionDigits)}`;
    }
    isFractionIncomplete(str) {
        return !!this.normalizeDigits(this.stripGroupingSeparator(str)).match(new RegExp(`^${INTEGER_PATTERN}${escapeRegExp(this.decimalSymbol)}$`));
    }
    isNegative(str) {
        return (str.startsWith(this.negativePrefix) ||
            (this.minusSign === undefined && (str.startsWith('(') || str.startsWith('-'))) ||
            (this.minusSign !== undefined && str.replace('-', this.minusSign).startsWith(this.minusSign)));
    }
    insertCurrency(str, negative) {
        return `${negative ? this.negativePrefix : this.prefix}${str}${negative ? this.negativeSuffix : this.suffix}`;
    }
    stripGroupingSeparator(str) {
        return this.groupingSymbol !== undefined ? str.replace(new RegExp(escapeRegExp(this.groupingSymbol), 'g'), '') : str;
    }
    stripSignLiterals(str) {
        if (this.minusSign !== undefined) {
            return str.replace('-', this.minusSign).replace(this.minusSign, '');
        }
        else {
            return str.replace(/[-()]/g, '');
        }
    }
    stripCurrency(str, negative) {
        return str.replace(negative ? this.negativePrefix : this.prefix, '').replace(negative ? this.negativeSuffix : this.suffix, '');
    }
    normalizeDecimalSeparator(str, from) {
        DECIMAL_SEPARATORS.forEach((s) => {
            str = str.substr(0, from) + str.substr(from).replace(s, this.decimalSymbol);
        });
        return str;
    }
    normalizeDigits(str) {
        if (this.digits[0] !== '0') {
            this.digits.forEach((digit, index) => {
                str = str.replace(new RegExp(digit, 'g'), String(index));
            });
        }
        return str;
    }
    onlyDigits(str) {
        return this.normalizeDigits(str).replace(/\D+/g, '');
    }
    onlyLocaleDigits(str) {
        return str.replace(new RegExp(`[^${this.digits.join('')}]*`, 'g'), '');
    }
}

class AbstractInputMask {
    constructor(currencyFormat) {
        this.currencyFormat = currencyFormat;
    }
}
class DefaultInputMask extends AbstractInputMask {
    conformToMask(str, previousConformedValue = '') {
        const negative = this.currencyFormat.isNegative(str);
        const isEmptyNegativeValue = (str) => str === '' &&
            negative &&
            !(this.currencyFormat.minusSign === undefined
                ? previousConformedValue === this.currencyFormat.negativePrefix + this.currencyFormat.negativeSuffix
                : previousConformedValue === this.currencyFormat.negativePrefix);
        const checkIncompleteValue = (str) => {
            if (isEmptyNegativeValue(str)) {
                return '';
            }
            else if (this.currencyFormat.maximumFractionDigits > 0) {
                if (this.currencyFormat.isFractionIncomplete(str)) {
                    return str;
                }
                else if (str.startsWith(this.currencyFormat.decimalSymbol)) {
                    return this.currencyFormat.toFraction(str);
                }
            }
            return null;
        };
        let value = str;
        value = this.currencyFormat.stripCurrency(value, negative);
        value = this.currencyFormat.stripSignLiterals(value);
        const incompleteValue = checkIncompleteValue(value);
        if (incompleteValue != null) {
            return this.currencyFormat.insertCurrency(incompleteValue, negative);
        }
        const [integer, ...fraction] = value.split(this.currencyFormat.decimalSymbol);
        const integerDigits = removeLeadingZeros(this.currencyFormat.onlyDigits(integer));
        const fractionDigits = this.currencyFormat.onlyDigits(fraction.join('')).substr(0, this.currencyFormat.maximumFractionDigits);
        const invalidFraction = fraction.length > 0 && fractionDigits.length === 0;
        const invalidNegativeValue = integerDigits === '' &&
            negative &&
            (this.currencyFormat.minusSign === undefined
                ? previousConformedValue === str.slice(0, -2) + this.currencyFormat.negativeSuffix
                : previousConformedValue === str.slice(0, -1));
        if (invalidFraction || invalidNegativeValue || isEmptyNegativeValue(integerDigits)) {
            return previousConformedValue;
        }
        else if (integerDigits.match(/\d+/)) {
            return {
                numberValue: Number(`${negative ? '-' : ''}${integerDigits}.${fractionDigits}`),
                fractionDigits
            };
        }
        else {
            return '';
        }
    }
}
class AutoDecimalDigitsInputMask extends AbstractInputMask {
    conformToMask(str, previousConformedValue = '') {
        if (str === '' ||
            (this.currencyFormat.parse(previousConformedValue) === 0 &&
                this.currencyFormat.stripCurrency(previousConformedValue, true).slice(0, -1) === this.currencyFormat.stripCurrency(str, true))) {
            return '';
        }
        const negative = this.currencyFormat.isNegative(str);
        const numberValue = this.currencyFormat.stripSignLiterals(str) === ''
            ? -0
            : Number(`${negative ? '-' : ''}${removeLeadingZeros(this.currencyFormat.onlyDigits(str))}`) / Math.pow(10, this.currencyFormat.maximumFractionDigits);
        return {
            numberValue,
            fractionDigits: numberValue.toFixed(this.currencyFormat.maximumFractionDigits).slice(-this.currencyFormat.maximumFractionDigits)
        };
    }
}

const DEFAULT_OPTIONS = {
    locale: undefined,
    currency: undefined,
    currencyDisplay: undefined,
    hideGroupingSeparatorOnFocus: true,
    hideCurrencySymbolOnFocus: true,
    hideNegligibleDecimalDigitsOnFocus: true,
    precision: undefined,
    autoDecimalDigits: false,
    valueRange: undefined,
    useGrouping: undefined,
    valueScaling: undefined
};
class CurrencyInput {
    constructor(args) {
        this.el = args.el;
        this.onInput = args.onInput;
        this.onChange = args.onChange;
        this.addEventListener();
        this.init(args.options);
    }
    setOptions(options) {
        this.init(options);
        this.format(this.currencyFormat.format(this.validateValueRange(this.numberValue)));
        this.onChange(this.getValue());
    }
    getValue() {
        const numberValue = this.valueScaling && this.numberValue != null ? this.toInteger(this.numberValue, this.valueScaling) : this.numberValue;
        return { number: numberValue, formatted: this.formattedValue };
    }
    setValue(value) {
        const newValue = this.valueScaling !== undefined && value != null ? this.toFloat(value, this.valueScaling) : value;
        if (newValue !== this.numberValue) {
            this.format(this.currencyFormat.format(this.validateValueRange(newValue)));
            this.onChange(this.getValue());
        }
    }
    init(options) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        };
        if (this.options.autoDecimalDigits) {
            this.options.hideNegligibleDecimalDigitsOnFocus = false;
        }
        if (!this.el.getAttribute('inputmode')) {
            this.el.setAttribute('inputmode', this.options.autoDecimalDigits ? 'numeric' : 'decimal');
        }
        this.currencyFormat = new CurrencyFormat(this.options);
        this.numberMask = this.options.autoDecimalDigits ? new AutoDecimalDigitsInputMask(this.currencyFormat) : new DefaultInputMask(this.currencyFormat);
        const valueScalingOptions = {
            [ValueScaling.precision]: this.currencyFormat.maximumFractionDigits,
            [ValueScaling.thousands]: 3,
            [ValueScaling.millions]: 6,
            [ValueScaling.billions]: 9
        };
        this.valueScaling = this.options.valueScaling ? valueScalingOptions[this.options.valueScaling] : undefined;
        this.valueScalingFractionDigits =
            this.valueScaling !== undefined && this.options.valueScaling !== ValueScaling.precision
                ? this.valueScaling + this.currencyFormat.maximumFractionDigits
                : this.currencyFormat.maximumFractionDigits;
        this.minValue = this.getMinValue();
        this.maxValue = this.getMaxValue();
    }
    getMinValue() {
        var _a, _b;
        let min = this.toFloat(-Number.MAX_SAFE_INTEGER);
        if (((_a = this.options.valueRange) === null || _a === void 0 ? void 0 : _a.min) !== undefined) {
            min = Math.max((_b = this.options.valueRange) === null || _b === void 0 ? void 0 : _b.min, this.toFloat(-Number.MAX_SAFE_INTEGER));
        }
        return min;
    }
    getMaxValue() {
        var _a, _b;
        let max = this.toFloat(Number.MAX_SAFE_INTEGER);
        if (((_a = this.options.valueRange) === null || _a === void 0 ? void 0 : _a.max) !== undefined) {
            max = Math.min((_b = this.options.valueRange) === null || _b === void 0 ? void 0 : _b.max, this.toFloat(Number.MAX_SAFE_INTEGER));
        }
        return max;
    }
    toFloat(value, maxFractionDigits) {
        return value / Math.pow(10, maxFractionDigits !== null && maxFractionDigits !== void 0 ? maxFractionDigits : this.valueScalingFractionDigits);
    }
    toInteger(value, maxFractionDigits) {
        return Number(value
            .toFixed(maxFractionDigits !== null && maxFractionDigits !== void 0 ? maxFractionDigits : this.valueScalingFractionDigits)
            .split('.')
            .join(''));
    }
    validateValueRange(value) {
        return value != null ? Math.min(Math.max(value, this.minValue), this.maxValue) : value;
    }
    format(value, hideNegligibleDecimalDigits = false) {
        var _a, _b;
        if (value != null) {
            if (this.decimalSymbolInsertedAt !== undefined) {
                value = this.currencyFormat.normalizeDecimalSeparator(value, this.decimalSymbolInsertedAt);
                this.decimalSymbolInsertedAt = undefined;
            }
            const conformedValue = this.numberMask.conformToMask(value, this.formattedValue);
            let formattedValue;
            if (typeof conformedValue === 'object') {
                const { numberValue, fractionDigits } = conformedValue;
                let { maximumFractionDigits, minimumFractionDigits } = this.currencyFormat;
                if (this.focus) {
                    minimumFractionDigits = hideNegligibleDecimalDigits
                        ? fractionDigits.replace(/0+$/, '').length
                        : Math.min(maximumFractionDigits, fractionDigits.length);
                }
                else if (Number.isInteger(numberValue) && !this.options.autoDecimalDigits && (this.options.precision === undefined || minimumFractionDigits === 0)) {
                    minimumFractionDigits = maximumFractionDigits = 0;
                }
                formattedValue =
                    this.toInteger(Math.abs(numberValue)) > Number.MAX_SAFE_INTEGER
                        ? this.formattedValue
                        : this.currencyFormat.format(numberValue, {
                            useGrouping: this.options.useGrouping !== false && !(this.focus && this.options.hideGroupingSeparatorOnFocus),
                            minimumFractionDigits,
                            maximumFractionDigits
                        });
            }
            else {
                formattedValue = conformedValue;
            }
            if (this.maxValue <= 0 && !this.currencyFormat.isNegative(formattedValue) && this.currencyFormat.parse(formattedValue) !== 0) {
                formattedValue = formattedValue.replace(this.currencyFormat.prefix, this.currencyFormat.negativePrefix);
            }
            if (this.minValue >= 0) {
                formattedValue = formattedValue.replace(this.currencyFormat.negativePrefix, this.currencyFormat.prefix);
            }
            if (this.focus && typeof this.options.accountingSign !== 'boolean' && ((_a = this.options.accountingSign) === null || _a === void 0 ? void 0 : _a.show) && ((_b = this.options.accountingSign) === null || _b === void 0 ? void 0 : _b.hideOnFocus)) {
                formattedValue = formattedValue.replace('(', '-').replace(')', '');
            }
            if (this.options.currencyDisplay === CurrencyDisplay.hidden || (this.focus && this.options.hideCurrencySymbolOnFocus)) {
                formattedValue = formattedValue
                    .replace(this.currencyFormat.negativePrefix, this.currencyFormat.minusSign !== undefined ? this.currencyFormat.minusSign : '(')
                    .replace(this.currencyFormat.negativeSuffix, this.currencyFormat.minusSign !== undefined ? '' : ')')
                    .replace(this.currencyFormat.prefix, '')
                    .replace(this.currencyFormat.suffix, '');
            }
            this.el.value = formattedValue;
            this.numberValue = this.currencyFormat.parse(formattedValue);
        }
        else {
            this.el.value = '';
            this.numberValue = null;
        }
        this.formattedValue = this.el.value;
        this.onInput(this.getValue());
    }
    addEventListener() {
        this.el.addEventListener('input', (e) => {
            const { value, selectionStart } = this.el;
            const inputEvent = e;
            if (selectionStart && inputEvent.data && DECIMAL_SEPARATORS.includes(inputEvent.data)) {
                this.decimalSymbolInsertedAt = selectionStart - 1;
            }
            this.format(value);
            if (this.focus && selectionStart != null) {
                const getCaretPositionAfterFormat = () => {
                    const { prefix, suffix, decimalSymbol, maximumFractionDigits, groupingSymbol } = this.currencyFormat;
                    let caretPositionFromLeft = value.length - selectionStart;
                    const newValueLength = this.formattedValue.length;
                    if (this.currencyFormat.minusSign === undefined && (value.startsWith('(') || value.startsWith('-')) && !value.endsWith(')')) {
                        console.info('IF 1', "value", value, "formattedValue", this.formattedValue, this.currencyFormat.negativeSuffix, "selectionStart", selectionStart, this.formattedValue.substring(selectionStart).length, this.currencyFormat.negativeSuffix.length > 1 ? this.formattedValue.substring(selectionStart).length : 1);
                        return newValueLength - this.currencyFormat.negativeSuffix.length > 1 ? this.formattedValue.substring(selectionStart).length : 1;
                    }
                    if (this.formattedValue.substr(selectionStart, 1) === groupingSymbol &&
                        count(this.formattedValue, groupingSymbol) === count(value, groupingSymbol) + 1) {
                        return newValueLength - caretPositionFromLeft - 1;
                    }
                    if (newValueLength < caretPositionFromLeft) {
                        return selectionStart;
                    }
                    if (decimalSymbol !== undefined && value.indexOf(decimalSymbol) !== -1) {
                        const decimalSymbolPosition = value.indexOf(decimalSymbol) + 1;
                        if (Math.abs(newValueLength - value.length) > 1 && selectionStart <= decimalSymbolPosition) {
                            return this.formattedValue.indexOf(decimalSymbol) + 1;
                        }
                        else {
                            if (!this.options.autoDecimalDigits && selectionStart > decimalSymbolPosition) {
                                if (this.currencyFormat.onlyDigits(value.substr(decimalSymbolPosition)).length - 1 === maximumFractionDigits) {
                                    caretPositionFromLeft -= 1;
                                }
                            }
                        }
                    }
                    return this.options.hideCurrencySymbolOnFocus || this.options.currencyDisplay === CurrencyDisplay.hidden
                        ? newValueLength - caretPositionFromLeft
                        : Math.max(newValueLength - Math.max(caretPositionFromLeft, suffix.length), prefix.length);
                };
                this.setCaretPosition(getCaretPositionAfterFormat());
            }
        });
        this.el.addEventListener('focus', () => {
            this.focus = true;
            this.numberValueOnFocus = this.numberValue;
            setTimeout(() => {
                const { value, selectionStart, selectionEnd } = this.el;
                this.format(value, this.options.hideNegligibleDecimalDigitsOnFocus);
                if (selectionStart != null && selectionEnd != null && Math.abs(selectionStart - selectionEnd) > 0) {
                    this.setCaretPosition(0, this.el.value.length);
                }
                else if (selectionStart != null) {
                    const caretPositionOnFocus = this.getCaretPositionOnFocus(value, selectionStart);
                    this.setCaretPosition(caretPositionOnFocus);
                }
            });
        });
        this.el.addEventListener('blur', () => {
            this.focus = false;
            this.format(this.currencyFormat.format(this.validateValueRange(this.numberValue)));
            console.info('BLUR listener', this.numberValueOnFocus, this.numberValue);
            if (this.numberValueOnFocus !== this.numberValue) {
                console.info('BLUR - change trigger', this.getValue());
                this.onChange(this.getValue());
            }
        });
    }
    getCaretPositionOnFocus(value, selectionStart) {
        if (this.numberValue == null) {
            return selectionStart;
        }
        const { prefix, negativePrefix, suffix, negativeSuffix, groupingSymbol, currency } = this.currencyFormat;
        const isNegative = this.numberValue < 0;
        const currentPrefix = isNegative ? negativePrefix : prefix;
        const prefixLength = currentPrefix.length;
        if (this.options.hideCurrencySymbolOnFocus || this.options.currencyDisplay === CurrencyDisplay.hidden) {
            if (isNegative) {
                if (selectionStart <= 1) {
                    return 1;
                }
                else if (value.endsWith(')') && selectionStart > value.indexOf(')')) {
                    return this.formattedValue.length - 1;
                }
            }
        }
        else {
            const suffixLength = isNegative ? negativeSuffix.length : suffix.length;
            if (selectionStart >= value.length - suffixLength) {
                return this.formattedValue.length - suffixLength;
            }
            else if (selectionStart < prefixLength) {
                return prefixLength;
            }
        }
        let result = selectionStart;
        if (this.options.hideCurrencySymbolOnFocus &&
            this.options.currencyDisplay !== CurrencyDisplay.hidden &&
            selectionStart >= prefixLength &&
            currency !== undefined &&
            currentPrefix.includes(currency)) {
            result -= prefixLength;
            if (isNegative) {
                result += 1;
            }
        }
        if (this.options.hideGroupingSeparatorOnFocus && groupingSymbol !== undefined) {
            result -= count(value.substring(0, selectionStart), groupingSymbol);
        }
        return result;
    }
    setCaretPosition(start, end = start) {
        this.el.setSelectionRange(start, end);
    }
}

const findInput = (el) => ((el === null || el === void 0 ? void 0 : el.matches('input')) ? el : el === null || el === void 0 ? void 0 : el.querySelector('input'));
function useCurrencyInput(options, autoEmit) {
    var _a, _b, _c, _d;
    let currencyInput;
    const inputRef = ref(null);
    const formattedValue = ref(null);
    const numberValue = ref(null);
    const vm = getCurrentInstance();
    const emit = (vm === null || vm === void 0 ? void 0 : vm.emit) || ((_b = (_a = vm === null || vm === void 0 ? void 0 : vm.proxy) === null || _a === void 0 ? void 0 : _a.$emit) === null || _b === void 0 ? void 0 : _b.bind(vm === null || vm === void 0 ? void 0 : vm.proxy));
    const props = ((vm === null || vm === void 0 ? void 0 : vm.props) || ((_c = vm === null || vm === void 0 ? void 0 : vm.proxy) === null || _c === void 0 ? void 0 : _c.$props));
    const isVue3 = version.startsWith('3');
    const lazyModel = isVue3 && ((_d = vm === null || vm === void 0 ? void 0 : vm.attrs.modelModifiers) === null || _d === void 0 ? void 0 : _d.lazy);
    const modelValue = computed(() => props === null || props === void 0 ? void 0 : props[isVue3 ? 'modelValue' : 'value']);
    const inputEvent = isVue3 ? 'update:modelValue' : 'input';
    const changeEvent = lazyModel ? 'update:modelValue' : 'change';
    watch(inputRef, (value) => {
        var _a;
        if (value) {
            const el = findInput((_a = value === null || value === void 0 ? void 0 : value.$el) !== null && _a !== void 0 ? _a : value);
            if (el) {
                currencyInput = new CurrencyInput({
                    el,
                    options,
                    onInput: (value) => {
                        if (!lazyModel && autoEmit !== false && modelValue.value !== value.number) {
                            emit === null || emit === void 0 ? void 0 : emit(inputEvent, value.number);
                        }
                        numberValue.value = value.number;
                        formattedValue.value = value.formatted;
                    },
                    onChange: (value) => {
                        if (autoEmit !== false) {
                            emit === null || emit === void 0 ? void 0 : emit(changeEvent, value.number);
                        }
                    }
                });
                currencyInput.setValue(modelValue.value);
            }
            else {
                console.error('No input element found. Please make sure that the "inputRef" template ref is properly assigned.');
            }
        }
        else {
            currencyInput = null;
        }
    });
    return {
        inputRef,
        numberValue,
        formattedValue,
        setValue: (value) => currencyInput === null || currencyInput === void 0 ? void 0 : currencyInput.setValue(value),
        setOptions: (options) => currencyInput === null || currencyInput === void 0 ? void 0 : currencyInput.setOptions(options)
    };
}

export { CurrencyDisplay, ValueScaling, useCurrencyInput };
