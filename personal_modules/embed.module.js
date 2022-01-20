//Import modules
const Discord = require('discord.js');
const { MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities;
const helper = require('../personal_modules/helper.module.js');

//Import config
const commandConfig = require('../config.json').commands;
const {username, avatar} = require('../config.json');

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
    createErrorEmbed(msg, menuEmbed = false){
        if(!menuEmbed)
            return {
                embeds: [this.createEmbed(
                    '',
                    msg || commandConfig.errorMsg,
                    null,
                    '',
                    0x4287f5
                )],
                ephemeral: true
            };
        else
            return [
                {embed: this.createEmbed(
                    '',
                    msg || commandConfig.errorMsg,
                    null,
                    '',
                    0x4287f5
                )},
            ];
    },

    //Function to create (emoji) buttons for an embed
    //Labels/types can either be a single 1D row or multiple 2D rows, but must have the same shape and not more than 5 columns
    //Output is always 2D
    createButtons(labels, styles){

        //Convert 1D to 2D
        if(!Array.isArray(labels[0])){
            labels = [labels]; styles = [styles];
        }

        //Convert every row to a message action row
        buttons = []
        for(let row = 0; row < labels.length; row++){
            let msgActRow = new MessageActionRow();

            //Add a button for every column in that row
            for(let col = 0; col < labels[row].length; col++){
                msgActRow = msgActRow.addComponents(new MessageButton()
                    .setCustomId(labels[row][col])
                    .setEmoji(labels[row][col])
                    .setStyle(styles[row][col])
                );
            }
            buttons.push(msgActRow)
        }

        return buttons
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

    //Function to add the listItemFunction and it's args to every list item
    addListItemFunctions(listItems, listItemFunctions){
        return listItems.map(listItem => {

            //Get the the function from the listItemFunction array, by matching the included regular expression against the list item title.
            let listItemFunction = listItemFunctions.find(
                listItemFunction => {
                    let functionRegExp = new RegExp(listItemFunction[1]);
                    return listItem.title.match(functionRegExp);
                });

                //Only proceed to add a function, when there is a match.
            if(listItemFunction[0] != null) {  
                listItem['function'] = listItemFunction[0]
                listItem['args'] = listItemFunction[2];
            }

            return listItem
        })
    },

    //Class to send embed(s) to the user, with a navigation menu for multiple embeds and the option to specify an action for list items of a field if any.
    //This navigation menu consists of emoji buttons the user can react to to go to the next or previous embed or perform a certain action on a list item.
    //For the list items to be responsive, function(s) must be defined in the 'listItemFunctions' parameter in the following way: [[function, RegExp],[function, RegExp], etc.].
    //The first function whose regular expression matches the activated list item's title will take that title (or url if available and if useURL is 'true') as an argument.
    //In case the function generates an embed, that embed is loaded.
    //A function can only be performed if the embed object contains the list items in their listItems property.
    MenuEmbed: class {

        //Declare properties
        embedConfig;
        interaction;
        embeds;
        files;

        pagesLen;
        pageIndexes;
        listItemIndexes;
        collector;
        module;
        numButtons;

        constructor(embedConfig, interaction, embeds, files = null){
            this.embedConfig = embedConfig;
            this.interaction = interaction;
            this.embeds = embeds;
            this.files = files;

            this.pagesLen = [embeds.length]
            this.pageIndexes = [0]
            this.listItemIndexes = []

            this.module = require('../personal_modules/embed.module.js');

            this.numButtons = ['1⃣','2⃣','3⃣','4⃣','5⃣','6⃣','7⃣','8⃣','9⃣','🔟'];

        }

        //Method to send the first embed with buttons and setup the collector
        async start(){

            try{

                //Send first message
                try{
                    await this.interaction.reply({embeds: [this.getEmbed().embed], components: this.getMenu()});
                } catch(error){
                    await this.interaction.editReply({embeds: [this.getEmbed().embed], components: this.getMenu()});
                }
                let sentMsg = await this.interaction.fetchReply()

                //Function to filter reactions. The user can't be a bot and must be the same who sent the origin command,
                //the interaction must either be a button or select menu
                let filter = async (menuInteraction) => {
                    await menuInteraction.deferUpdate();
                    return !menuInteraction.user.bot && menuInteraction.user.id === this.interaction.user.id
                        && (menuInteraction.isButton() || menuInteraction.isSelectMenu())
                }

                //Make Reaction Collector to collect reactions for send list embed
                this.collector = sentMsg.createMessageComponentCollector({filter, time: this.embedConfig.expireTime});
                
                //Event to fire when reaction is measured
                this.collector.on('collect', async menuInteraction => {
                    if(menuInteraction.isButton()){
                        switch(menuInteraction.customId){
                            //Load previous embed
                            case "⬅️":
                                this.prev();
                                break;
                            //Load next embed
                            case "➡️":
                                this.next();
                                break;
                            //Return before opening list item
                            case "⬆️":
                                this.return();
                                break;
                            //Delete embed message
                            case "✖":
                                this.close();
                                return
                                break;
                            //Open embed(s) of list item
                            default:
                                await this.openListItem(menuInteraction.customId);
                                break;
                        }
                    //Go to a specific embed page
                    } else if (menuInteraction.isSelectMenu()){
                        this.pageIndexes[this.pageIndexes.length-1] = Number(menuInteraction.values[0])
                    }

                    //Update embed message with the correct embed and buttons
                    await menuInteraction.editReply({embeds: [this.getEmbed().embed], components: this.getMenu()});
                })

                //Event to fire when the collector ends.
                this.collector.on('end', async () => {
                    try{
                        return await this.interaction.editReply({embeds: [this.getEmbed().embed.setFooter({text: this.embedConfig.expireMsg})], components: []});
                    } catch(e){}
                });

            } catch(e){
                console.error(e);
                return this.module.createErrorEmbed();
            }

        }

        //Method to retrieve embed recursively among list items and adding last info.
        getEmbed(embeds = this.embeds, pageLevel = 0, listItemLevel = 0, footer = ''){

            //Get current embed and footer
            let currentPageIndex = this.pageIndexes[pageLevel];
            let currentListItemKey = String(this.listItemIndexes[listItemLevel] + 1);
            let currentEmbed = embeds[currentPageIndex];
            footer += 'Page ' + (this.pageIndexes[pageLevel] + 1) + "/" + this.pagesLen[pageLevel];

            //Base case: When no listItemIndex is present at the current level, the current embed should be returned
            if(listItemLevel == this.listItemIndexes.length){
                currentEmbed.embed = currentEmbed.embed
                    .setTimestamp(Date.now())
                    .setFooter({text: footer});
                if(this.files != null)
                    currentEmbed.embed = currentEmbed.embed.attachFiles(this.files)

                return currentEmbed
            }
            else //Otherwise, keep searching
                return this.getEmbed(currentEmbed.listItems[currentListItemKey].subEmbeds, ++pageLevel, ++listItemLevel, footer + '\n')
        }


        //Method to retrieve a menu based on the current embeds
        getMenu(){

            const currentPageIndex = this.pageIndexes[this.pageIndexes.length-1];
            const currentNumPages = this.pagesLen[this.pagesLen.length-1];

            //Add navigation button for previous, next, return from list item and close
            const buttonRows = [[]];
            const buttonRowStyles = [[]];
            buttonRows[0].push("✖"); buttonRowStyles[0].push('DANGER');
            if(this.pageIndexes.length > 1){ buttonRows[0].push('⬆️'); buttonRowStyles[0].push('SECONDARY');}
            if(currentPageIndex > 0){ buttonRows[0].push('⬅️'); buttonRowStyles[0].push('SECONDARY');}
            if(currentPageIndex < currentNumPages - 1){ buttonRows[0].push('➡️'); buttonRowStyles[0].push('SECONDARY');}

            //Add buttons for the number of list items in rows of max 5 items if there are functions and/or the list items have subembeds
            let currentListItems = this.getEmbed().listItems;
            if(currentListItems != null && (Object.values(currentListItems).every(li => li.function != null || li.subEmbeds != null))){
                currentListItems = Object.values(currentListItems);
                if(currentListItems.length <= 5){
                    buttonRows.push(this.numButtons.slice(0, currentListItems.length));
                    buttonRowStyles.push(new Array(currentListItems.length).fill('PRIMARY'));
                }
                else {
                    buttonRows.push(this.numButtons.slice(0, 5));
                    buttonRowStyles.push(new Array(5).fill('PRIMARY'));

                    buttonRows.push(this.numButtons.slice(5, currentListItems.length));
                    buttonRowStyles.push(new Array(currentListItems.length).fill('PRIMARY'));  
                }
            }

            let menu = this.module.createButtons(buttonRows, buttonRowStyles);

            //Create select menu for multiple pages
            if(currentNumPages > 1){

                //When the number of options are <=25 create an option for every page
                let options;
                if(currentNumPages <= 25){
                    options = Array(currentNumPages).fill('').map( (_, i) => {
                        return {label:'Page ' + (i+1), value: String(i)};
                    })
                //If this >25, create 25 page options at even intervals
                } else {
                    options = [];
                    const interval = Math.floor(currentNumPages / 25);
                    const remainder = currentNumPages % 25;
                    for(let i=0; i < currentNumPages; i += interval){

                        //Spread out the remainder evenly over all intervals
                        if(remainder != 0 && i % Math.round((currentNumPages / (remainder+1))) == 0) 
                            i++;
                        options.push({label:'Page ' + (i+1), value: String(i)});
                    }
                }

                let selectMenu = new MessageActionRow().addComponents(new MessageSelectMenu()
                    .setCustomId('select')
                    .setPlaceholder('Select a page')
                    .addOptions(options)
                );
                menu.push(selectMenu);
            }

            return menu;
        }
        
        //Method for button interactions
        prev(){
            if(this.pageIndexes[this.pageIndexes.length-1] > 0)
                this.pageIndexes[this.pageIndexes.length-1] -= 1;
        }

        next(){
            if(this.pageIndexes[this.pageIndexes.length-1] < this.pagesLen[this.pagesLen.length-1] - 1)
                this.pageIndexes[this.pageIndexes.length-1] += 1;
        }

        return(){
            if(this.pageIndexes.length > 1){
                this.pageIndexes.pop()
                this.pagesLen.pop()
                this.listItemIndexes.pop()
            }
        }

        close(){
            this.interaction.deleteReply();
        }

        async openListItem(numButton){
            
            try {

                //If there are list items available for the current embed in the property,
                //get the list item associated with the (number) emoji
                let currentListItems = this.getEmbed().listItems;
                if(currentListItems != null) {
                    currentListItems = Object.values(currentListItems)

                    //Get the list item from the embed object based on the number emoji.
                    const listItemIndex = this.numButtons.findIndex(nm => nm == numButton);
                    const listItem = currentListItems[listItemIndex];

                    //If none is returned stop
                    if(listItem == null) return;

                    //When this list item has no subembeds and there is a listItemFunction, retrieve the function to retrieve the subembeds
                    //And assign it to the listItem
                    if(listItem.subEmbeds == null && listItem.function != null){
                        let subEmbeds = await listItem.function(
                            (listItem.url && listItem.useURL)? listItem.url : listItem.title,
                            {...listItem.args}
                        );
                        this.getEmbed().listItems[String(listItemIndex+1)].subEmbeds = subEmbeds;                 
                    }

                    //When the list item now has subembeds, either because they were already present, or generated by a function, add indexes
                    if(listItem.subEmbeds != null){
                        this.pageIndexes.push(0);
                        this.pagesLen.push(listItem.subEmbeds.length);
                        this.listItemIndexes.push(listItemIndex);
                    }
                } 
            } catch(e){
                throw e
            }
        }
    }
};