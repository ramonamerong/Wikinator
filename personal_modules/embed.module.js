//Import modules
const Discord = require('discord.js');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities;
const helper = require('../personal_modules/helper.module.js');

//Import config
const commandConfig = require('../config.json').commands;
const{prefix, username, avatar} = require('../config.json');

module.exports = {

    //Function to create a single embed.
    createEmbed(title, description, url, thumbnail, color){
        return new Discord.MessageEmbed()
            .setTitle(title)
            .setDescription(description)
            .setURL(url)
            .setThumbnail(thumbnail)
            .setColor(color)
    },


    //Function to create a default embed when an error occurs
    createErrorEmbed(msg){
        return [{
            embed: this.createEmbed(
                '',
                msg || commandConfig.errorMsg,
                null,
                '',
                0x4287f5
            )
        }];
    },


    //Function that returns embeds in an array.
    //When specifying a field name, either a field value or list items must also be specified.
    //When list items are specified, new embeds are created for every 10 items or 1023 characters.
    //(Subsets of) list items are then converted to strings and placed in the field values of those arrays.
    //By default, the original list items are also saved into the listItems property of an embed object.

    createListEmbed(embedConfig, title, description, url, thumbnail, fieldName = null, fieldValue = null, listItems = null, keepListItems = true){

        //Setting up embeds array
        let embeds = [];

        //Separate the description into strings of a certain maximum length
        let descriptionArray = [];
        let descriptionWords = description.split(' ');

        do{
            descriptionArray.push([]);

            //Add the words of the description to every new description part
            while(descriptionArray[descriptionArray.length - 1].join(' ').length < embedConfig.maxDescCharPerEmbed && descriptionWords.length){
                descriptionArray[descriptionArray.length - 1].push(descriptionWords.shift());
            }
        }
        while(descriptionWords.length);

        //Join the words together into a string for every description part and remove any empty strings.
        descriptionArray = descriptionArray
            .map(description => {
                return description.join(' ');
            })
            .filter(description => description !== '');

        //If the array is now empty, add an empty description string element
        if(!descriptionArray.length){
            descriptionArray.push('');
        }

        //If there are no list items, make a single embed object and add field name + value if available
        if(listItems === null || !listItems.length){
            embeds.push({
                embed: this.createEmbed(title, descriptionArray[0] !== undefined? descriptionArray.shift(): '', url, thumbnail, embedConfig.color),
                listItems: null,
            });
            if(fieldValue !== null){
                embeds[0].embed.addField(fieldName, fieldValue)
            }
         }

        //If there are list items, make embeds to display all list items conjugated to a single field value.
        //If 'keepListItems' is set to true (by default), they will also be added individually to the listItems property of the embed object.
        else{

            //For loop to make new embed objects in the embeds array.
            //Runs till there are no more list items to be added to embed objects.
            for(let x = 0; listItems.length > 0; x++) {

                //Make new embed object.
                embeds.push({
                    embed: this.createEmbed(title, descriptionArray[0] !== undefined? descriptionArray.shift(): '', url, thumbnail, embedConfig.color),
                    listItems: {},
                });

                //Setup and reset temporary variables for list object.
                let list = '';
                let items = {};
                let addition = '';

                //For loop to insert the list items into the temporary variables.
                //Runs till the amount of list items of a list exceeds 10, a length of 1023 characters
                //or if there are more than x new line characters.
                for(let i = 1; Object.keys(items).length < embedConfig.maxResultsPerEmbed
                && list.length + addition.length < embedConfig.maxFieldCharPerEmbed
                && (list.match(/\n/g) === null || list.match(/\n/g).length <= embedConfig.maxFieldLinesPerEmbed); i++) {

                    //Reset temporary addition variable for list string
                    addition = '';

                    //If keepListItems is set to false, they won't be added tot the property
                    if(keepListItems === true){
                        items[i] = listItems[0];
                    }

                    //If an url is set an discord link is generated.
                    if(listItems[0].url !== null && listItems[0].url !== undefined){

                        //If keepListItems is set to true, navigation numbering is added.
                        if(keepListItems === true){
                            addition += "**(" + i + ")** ";
                        }

                        addition += "[" + helper.removeHTML(listItems[0].title) + "](" + helper.encDiscordURL(listItems[0].url, true) + ")\n";
                    }
                    //Otherwise only the title is displayed in italics
                    else{
                        addition += "**(" + i + ")** " + helper.removeHTML(listItems[0].title) + '\n';
                    }

                    //If a description is set for the list item, it is added.
                    if(listItems[0].description != null && listItems[0].description !== ''){

                        //Highlight the searched word, convert html entities to UTF-8 and remove wiki markup from description
                        description = entities.decode(listItems[0].description);
                        description = description
                            .replace()
                            .replace(/\*/g, '')
                            .replace(/<span class=['"]searchmatch['"]>/g, '$')
                            .replace(/<\/span>/g, '$')
                            .replace(/\[/g, '')
                            .replace(/\]/g, '')
                            .replace(/\'\'/g, '');

                        addition += "```tex\n" + description + "```\n"
                    }

                    //Add addition to list string if it would not exceed 1023 character. Otherwise, break out of the loop.
                    if(list.length + addition.length < embedConfig.maxFieldCharPerEmbed){
                        list += addition;
                    } else{
                        break;
                    }

                    //Break out of loop when there's only one element in the array, as it would otherwise throw an error.
                    if(listItems.length === 1){
                        listItems.shift();
                        break
                    }

                    //Remove list item from array.
                    listItems.shift();

                }

                //Add temporary variables to new list object.
                embeds[x].embed.addField(fieldName, list.replace(/\n$/, ''));
                embeds[x].listItems = keepListItems? items : null;
            }
        }

        //When the description array with description parts isn't empty yet, the last created embed will be repeated,
        //till all of the description is filled in.

        while(descriptionArray.length > 0){

            let newEmbed = new Discord.MessageEmbed(embeds[embeds.length - 1].embed);
            embeds.push({embed: newEmbed, listItems: embeds[embeds.length - 1].listItems});
            embeds[embeds.length - 1].embed.description = descriptionArray.shift();
        }

        //Return the embeds array
        return embeds;
    },


    //Function to send embed(s) to the user, with a navigation menu for multiple embeds and the option to specify an action for list items of a field if any.
    //This navigation menu consists of emojis the user can react to to go to the next or previous embed or perform a certain action on a list item.
    //For the list items to be responsive, function(s) must be defined in the 'listItemFunctions' parameter in the following way: [[function, RegExp],[function, RegExp], etc.].
    //The first function whose regular expression matches the activated list item's title will take that title (or url if available and if useURL is 'true') as an argument.
    //In case the function generates an embed, that embed is loaded.
    //A function can only be performed if the embed object contains the list items in their listItem property.

    async sendEmbed(embedConfig, message, embeds, listItemFunctions = null, files = null) {

        try{

            //Initiate page number, lock, sub pages and last page numbers variables, save the command message for later use and import embed config
            let pageNum = 0;
            let lock = false;
            let subPages = [];
            let lastPagesNum = [];
            const commandMsg = message;

            //Setup array of emojis buttons to react to
            const emojis = [
                ['backward', '⬅️'],
                ['forward', '➡️'],
                ['1', '1⃣'],
                ['2', '2⃣'],
                ['3', '3⃣'],
                ['4', '4⃣'],
                ['5', '5⃣'],
                ['6', '6⃣'],
                ['7', '7⃣'],
                ['8', '8⃣'],
                ['9', '9⃣'],
                ['10', '🔟'],
                ['delete', '❌'],
            ];

            //Function to retrieve list embed from list object and adding last info.
            const getEmbed = function(pageNum) {
                return embeds[pageNum].embed
                    .setTimestamp(Date.now())
                    .setFooter('Page ' + (pageNum + 1) + " of " + embeds.length);
            };

            //Function to filter reactions. The user can't be a bot and must be the same who sent the origin command.
            //The reaction must also be included in the emoji array and the reaction lock should be lifted.
            function filter(reaction, user) {
                return !user.bot && user.id === commandMsg.author.id
                    && emojis.find(emoji => emoji[1] === reaction.emoji.name) != null
                    && !lock;
            }

            //Function to react to own message to add navigation buttons
            async function addEmojis(message, pageNum) {

                //When no listItemFunctions are specified or when there are no list items in the list item property,
                //then the maxNumber of number emojis (1-10) is set to 0.
                //Otherwise a number emoji is displayed for every list item
                let maxNumber;
                if(listItemFunctions === null || embeds[pageNum].listItems === undefined || embeds[pageNum].listItems === null){
                    maxNumber = 0;
                } else{
                    maxNumber = Object.keys(embeds[pageNum].listItems).length
                }

                //Check for every emoji if it should be added
                for(let i = 0; i < emojis.length; i++){

                    //Skip any emoji that is already present
                    if(message.reactions.cache.some(r => r.emoji.name === emojis[i][1])){
                        continue;
                    }

                    //If the number of embeds is bigger than one, echo left and right arrows
                    try{
                        if (embeds.length > 1 && emojis[i][1] === '⬅️') {
                            await message.react('⬅️');
                        }
                        if (embeds.length > 1 && emojis[i][1] === '➡️') {
                            await message.react('➡️');
                        }

                        //Display as much navigation emojis as there are list items on the current displayed embed
                        if (emojis[i][0] <= maxNumber) {
                            await message.react(emojis[i][1]);
                        }

                        //Echo the delete emojis as last
                        if (emojis[i][1] === '❌') {
                            await message.react('❌');
                        }
                    } catch {
                        return;
                    }
                }
            }

            //Sending first embed and reacting to own message
            if(files != null){
                message = await message.channel.send(getEmbed(pageNum).attachFiles(files));
            } else {
                message = await message.channel.send(getEmbed(pageNum));
            }

            addEmojis(message, pageNum);

            //Make Reaction Collector to collect reactions for send list embed
            const reactionCollector = message.createReactionCollector(filter,
                {time: embedConfig.expireTime}
            );

            //Event to fire when reaction is measured
            let delMessage = false;
            reactionCollector.on('collect', async collected => {

                //Enable the lock to prevent any other message
                lock = true;

                //If the reaction is the 'delete' emoji, delete the message and and the reaction collector
                if (collected.emoji.name === '❌') {
                    delMessage = true;
                    reactionCollector.stop();
                }

                //If the reaction is the 'arrow right' emoji, load the next embed
                else if (collected.emoji.name === '➡️' && (pageNum + 1 < embeds.length)) {
                    await message.edit({embed: getEmbed(++pageNum)});
                }

                //If the reaction is the 'arrow left' emoji, load the previous page
                //and remove any subpages/embeds when not on this embed anymore
                else if (collected.emoji.name === '⬅️' && pageNum > 0) {

                    if(subPages.length && pageNum <= (embeds.length - subPages[0])){
                        let subPagesDel = subPages.shift();
                        for(let i = 0; i < subPagesDel; i++){
                            embeds.pop();
                        }

                        pageNum = lastPagesNum.shift();
                        await message.edit({embed: getEmbed(pageNum)});
                    } else {
                        await message.edit({embed: getEmbed(--pageNum)});
                    }
                }

                //If the reaction is a number emoji AND listItemFunction(s) are defined
                //AND there are list items available for the current embed in the property,
                //get the list item associated with the (number) emoji and perform the function on it..
                else if (listItemFunctions !== null && embeds[pageNum].listItems != null) {

                    //Get the list item from the embed object based on the number emoji.
                    let listItems = await embeds[pageNum].listItems;
                    let listItem = await listItems[
                        Object.keys(listItems).find(key => {
                            return emojis.find(emoji => emoji[0] === key)[1] === collected.emoji.name;
                        })];

                    //If none is returned end the listener function.
                    if(listItem == null) return;

                    //When an embed was previously generated based on the list item title/url, get that embed from the subEmbed property.
                    //Otherwise, retrieve the function.
                    let newEmbeds;
                    if(listItem.subEmbed != null){
                        newEmbeds = listItem.subEmbed;
                    } else{

                        //Get the the function from the listItemFunction array, by matching the included regular expression against the list item title.
                        let listItemFunction = listItemFunctions.find(
                            listItemFunction => {
                                let functionRegExp = new RegExp(listItemFunction[1]);
                                return listItem.title.match(functionRegExp);
                            });

                        //Only proceed to perform a function, when there is a match.
                        if(listItemFunction[0] != null) {

                            //Then, perform the function by inserting the list item title (or url when 'useURL' is set to true) into that function,
                            newEmbeds = await listItemFunction[0](
                                message,
                                (listItem.url && listItem.useURL)? listItem.url : listItem.title,
                                commandMsg,
                                listItemFunction[2]
                            );
                        }

                    }

                    //Only if embeds have been/were previously generated by the function , it should be added to the local embed array
                    //And cached in the matching list item.
                    if(newEmbeds != null){

                        //Add them to the corresponding list item for caching and to local embed array.
                        subPages.unshift(newEmbeds.length);
                        listItem.subEmbed = newEmbeds;
                        embeds = embeds.concat(newEmbeds);

                        //Save the last page number the user was on
                        lastPagesNum.unshift(pageNum);

                        //Then load the first one of the new embeds.
                        pageNum = embeds.length - subPages[0];
                        await message.edit({embed: getEmbed(pageNum)});

                    }
                }

                //Lift the lock
                lock = false;

                //Clear reactions and add new ones
                await addEmojis(message, pageNum);
            });

            //Event to fire when the collector ends.
            reactionCollector.on('end', async collected => {
                try{
                    if(delMessage === true){
                        return await message.delete();
                    } else {
                        return await message.edit(getEmbed(pageNum).setFooter(embedConfig.expireMsg));
                    }
                } catch{}
            });

            return message;
        }
        catch(error){
            console.error(error);
            return this.createErrorEmbed();
        }
    }
};