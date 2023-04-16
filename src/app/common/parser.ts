
export function doesKeysExist<T extends string | number | symbol>(input: object, keyName: T | readonly T[]): input is { [key in T]: unknown } {
    let keyNameArray = Array.isArray(keyName) ? keyName : [keyName];
    let doesAllKeysExist = true;
    keyNameArray.forEach(aKeyName => {
        if (!(aKeyName in input)) doesAllKeysExist = false;
    });
    return doesAllKeysExist;
}

