//Import modules
const fs = require('fs');

module.exports = {
    getJSONFile(path){

        //Only continue if it exist
        if(!fs.existsSync(path)) return null;

        //Load the json file and return it
        return JSON.parse(fs.readFileSync(path, 'utf-8'));
    },

    isInteger(integer){
        return !Number.isNaN(Number(integer))
    },

    directMsg(msg, userMember, callbackTextChannel){
        return userMember.send(msg)
            .catch(async () => {
                const m = await callbackTextChannel.send(userMember.toString() + ', ' + msg +
                    '\nAlso, you should enable messages from server members.').catch(console.error);
                setTimeout(() => m.delete().catch(() => {
                    callbackTextChannel.guild.owner.send('I tried to delete a message from the server, but I wasn\'t able to.\nPlease give me this permission.')
                        .catch(console.error);
                }), 10000);
            });
    },

    encDiscordURL(url, encSpace = false){
        url = url
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\[/g, '&5B')
            .replace(/\]/g, '%5D')
            .replace(/\*/g, '%2A%0A');
        if(encSpace){
            return url.replace(/ /g, '%20')
        } else{
            return url.replace(/ /g, '_')
        }
    },

    removeHTML(string){
        return string.replace(/<[^>]*>?/gm, '');
    },

    getTitleFromURL(url){
        return url.match(/\[.+\]/).replace(' ', '_')
    },

    dd(variable){
        console.debug(variable);
        process.abort()
    },

    escRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    shuffleArray(array){

        //Loop backwards over all array elements
        for(let i = array.length - 1; i > 0; i --){

            //Select an random element's index that is lower than the current element's index
            let j = Math.floor(Math.random() * i);

            //Swap the two elements
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    separateEndBrackets(string){
        string = string.replace(/(\*|\|\|)/g, '').trim();
        const RE = new RegExp('\\([A-Za-z0-9\\-._| ]+\\)$');
        return [string.replace(RE, '').trim(), string.match(RE)? string.match(RE)[0] : null];
    },

    //Copy a reference object
    copy(x) {
        return JSON.parse(JSON.stringify(x))
    },

    //Return an array of values of a possible object
    //Or an array of every first property of every object if the data is an array of objects and returnFirstProperty is set to true.
    //Otherwise, just return what was given.
    getValues(data, returnFirstProperty = true) {
        if (typeof data === 'object' && !Array.isArray(data))
            return Object.values(data);
        if(returnFirstProperty && Array.isArray(data) && data.every(e => typeof e === 'object'))
            return data.map(e => Object.values(e)[0]);
        else
            return data;
    }

};