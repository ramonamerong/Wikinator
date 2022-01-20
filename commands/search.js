//Import modules
const wiki = require('../personal_modules/wiki.module.js');
const embed = require('../personal_modules/embed.module.js');
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');

//Import config
const searchConfig = require ('../config.json').commands.search;
const wikiConfig = require('../config.json').commands.wiki;

module.exports = {

    //The command for discord
    data: {
        type: 'CHAT_INPUT',
        defaultPermission: true,
        name: 'search',
        description: 'Search all wikis available on this server.',
        options: [
            {
                type: 'STRING',
                name: 'search',
                description: 'What to search for.',
                required: true
            }
        ]
    },

    //Additional info for permissions and help command
    longDescription:
        'This command can be used to search all wikis on this server for info.' +
        '\nExample: `/search Paris` - Search all wikis for pages containing the word \'Kuon\'.',
    usage: '[search]',
    
    //Additional info for permissions and help command
    guildOnly: true,
    dmOnly: false,

    //Command code
    async execute(interaction) {
        const search = interaction.options.getString('search');
        let listItems = [];

        //Defer reply
        await interaction.deferReply();

        //Retrieve all wikis for this server
        let res = await db.query('select * from wiki where guild_id = $1',
            [interaction.guild.id]);
        let wikis = res.rows;

        //When no wikis are found, use the default wiki
        if(!wikis.length){
            wikis = [helper.copy(wikiConfig)];
            wikis[0].api_path = wikiConfig.apiPaths[0];
            wikis[0].name = 'English Wikipedia'
        }        
        
        //Loop over all the wikis to add the list items
        //But do not include results which have 0 results
        for(wikiInfo of wikis){

            //Initiate object to save embeds and the number of results
            let subEmbeds = {};
            let resultsNum = {};

            //Get specific page info in the form of an embed from the wiki using the wiki api
            returnObject = await wiki.getPageListEmbed(search, wikiInfo);
            if(returnObject.numResults > 0){
                subEmbeds['page'] = returnObject.embeds;
                resultsNum['page'] = returnObject.numResults;
            }

            //Get a list of categories or category members incorporated in a embed using the wiki api.
            returnObject = await wiki.getCategoryListEmbed(search, wikiInfo, false);
            if(returnObject.numResults > 0){
                subEmbeds['category'] = returnObject.embeds;
                resultsNum['category'] = returnObject.numResults;
            }

            //Perform a text search on the wiki and return any results in the form of an embed
            returnObject = await wiki.getSearchListEmbed(search, wikiInfo);
            if(returnObject.numResults > 0){
                subEmbeds['search'] = returnObject.embeds;
                resultsNum['search'] = returnObject.numResults;
            }

            //Add the wiki results to the list items
            titlePart = {
                page: 'page search by title',
                category: 'category search',
                search: 'page search by body'
            }
            for(const [key, value] of Object.entries(subEmbeds)){
                listItems.push({
                    title: resultsNum[key] + ' results for ' + titlePart[key] + ' on wiki *' + wikiInfo.name + '* using `/wiki ' + key + '`',
                    url: value[0].embed.url,
                    subEmbeds: value
                });
            }
        }

        //Create a list embed displaying the number of results for each subcommand
        embeds = embed.createListEmbed(
            searchConfig.embed,
            'Returned wiki pages/categories for: ' + search,
            'Press one of the emoji buttons (1⃣-🔟) to load the results belonging to that subcommand.',
            null,
            '',
            'Results',
            null,
            listItems
        );
        
        //Send the embed in a message
        const menuEmbed = new embed.MenuEmbed(wikiConfig.embed, interaction, embeds);
        menuEmbed.start()
    },


    //Function for autocompletions
    async autocomplete(currentArgument, currentValue, interaction){

        //Retrieve all wikis registrered for this server
        const res = await db.query('select name, abbreviation, url from wiki where guild_id = $1', [interaction.guild.id]);

        //Create and return suggestions  
        return res.rows
            .map(row => row.abbreviation)
            .filter(abr => abr.toLowerCase().startsWith(currentValue.toLowerCase()))
            .sort();
    }
};
