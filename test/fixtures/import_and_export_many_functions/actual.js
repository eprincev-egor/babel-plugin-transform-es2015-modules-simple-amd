import {isString, isFunction} from "lodash";
import helpers from "helpers";

export function helper1() {
    return isString()
}

export function helper2() {
    return isFunction()
}

export function helper3() {
    return helpers.help();
}