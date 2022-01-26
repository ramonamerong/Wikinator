//Import modules
const helper = require('../personal_modules/helper.module.js');

module.exports = {
    solveString(string){

        //Remove any '$' signs
        string = string.replace('$', '');

        //Remove any unnecessary brackets
        string = this.removeBrackets(string);

        //Keep replacing the smallest brackets remaining brackets with $i
        let brackets = [];
        let i = 0;
        newBrackets = true;
        while(newBrackets){
            newBrackets = string.match(/\([^()]*\)/g);

            if(newBrackets != null){
                for(let br of newBrackets){

                    //Replace bracket in string with identifier
                    string = string.replace(br, '$'+i);

                    //Substitute any subbrackets within the bracket with their value
                    subBrackets = br.match(/\$\d+/g);
                    if(subBrackets != null)
                        for(const sbr of subBrackets)
                            br = br.replace(sbr, brackets[sbr.replace('$', '')])

                    //Save the bracket
                    i++;
                    brackets.push(br);
                }
            }
        }

        //Then, split the top level array based on increment operators
        let split = string.split(/[-+]/);

        //If that yields no results, split it based on multiplication/division operators, which are outside of any brackets
        //But in any case, save the splitting operators in an array
        let operators;
        if(split.length < 2){
            split = string.split(/[*/]/);

            //If even that yields no results, split it based on the power operator
            if(split.length < 2){
                split = string.split(/\^/);

                //If that still yields no splitted string, return the number
                if(split.length < 2)
                    return Number(string);
                else
                    operators = string.split(/[^\^]/);

            } else {
                operators = string.split(/[^*/]/);
            }
        }
        else {
            operators = string.split(/[^-+]/)
        }

        operators = operators.filter(o => o !== '').reverse();

        //Recursively call this function on the arithmetic terms of the splitted string from left to right
        //and return the (numerical) result
        let total = this.solveString(
            split[0].startsWith('$')?
                brackets[split[0].replace('$', '')] : split[0]);

        for(let i=1; i < split.length; i++){

            const term = this.solveString(
                split[i].startsWith('$')?
                    brackets[split[i].replace('$', '')] : split[i]);

            switch(operators.pop()){
                case '+':
                    total += term;
                    break;
                case '-':
                    total -= term;
                    break;
                case '*':
                    total *= term;
                    break;
                case '/':
                    total /= term;
                    break;
                case '^':
                    total **= term;
                    break;
            }
        }

        return total;
    },

    removeBrackets(string){

        //Trim the string on both ends of any spaces
        string = string.trim();

        //Check the number of opening and closing brackets and throw an exception
        //when not all brackets have been closed
        let openBr = 0;
        let minOpenBr = -1;
        let lastMinOpenBr = -1;
        let lastCh = '';
        let start = true;
        for(let i=0; i < string.length; i++){
            const ch = string.charAt(i);

            //When two following characters aren't the same,
            //update whether the start has been passed (defined as after all of the opening brackets at the start)
            const diffCh = lastCh !== ch && i !== string.length - 1;
            if(diffCh && start && i > 0)
                start = false;

            //Save the minimum number of brackets seen after the start
            if(!start && (minOpenBr === -1 || openBr < minOpenBr)){
                minOpenBr = openBr;
            }

            //When two following characters aren't the same,
            //save the minimum number of opening brackets.
            //At the end this will thus contain the minimum number of not closed brackets seen in the middle of the string.
            if(diffCh)
                lastMinOpenBr = minOpenBr;

            //Increment the open bracket counter according to the bracket
            switch(ch){
                case '(':
                    openBr++;
                    break;
                case ')':
                    if(openBr > 0)
                        openBr--;
                    else
                        throw Error('You can\'t start with closing brackets.');
                    break;
            }

            //Save the last character
            lastCh = ch;
        }

        //When openBr is now not 0, raise an error
        if(openBr !== 0)
            throw Error('Not all brackets have been closed.');

        //Remove as many brackets from the start and end
        //as the minimum number of open brackets seen in the middle of the string
        //and return the string
        return lastMinOpenBr !== -1?
            string.slice(lastMinOpenBr, string.length - lastMinOpenBr)
            : string;
    }
};