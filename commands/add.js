//Import modules
const axios = require('axios');
const url = require('url');
const db = require('../personal_modules/database.module.js');
const embed = require('../personal_modules/embed.module.js');

//Import config
const wikiConfig = require('../config.json').commands.wiki;
const helper = require('../personal_modules/helper.module.js');

module.exports = {

    //The command for discord
    data: {
        type: 'CHAT_INPUT',
        defaultPermission: true,
        name: 'add',
        description: 'Add (or update) a (new) wiki on this server.',
        options: [
            {
                type: 'STRING',
                name: 'abbreviation',
                description: 'The abbreviation to safe the wiki under.',
                required: true,
            },
            {
                type: 'STRING',
                name: 'url',
                description: 'The url to the wiki in the format `https://example.com`.',
                required: true,
            },
            {
                type: 'BOOLEAN',
                name: 'default',
                description: 'Set this wiki as the default for this server when using `/wiki` with an abbreviation.',
                required: true,
            }
        ]
    },
    
    //Additional info for permissions and help command
    category: 'Wiki',
    longDescription: 'Use this command to add (or update when using the same abbreviation) a wiki to this server. The provided wiki abbreviation can be used in conjunction with the `/wiki` command to search that wiki.' +
        'The wiki url must be of the format `https://example.com`. You can also set the wiki as the default for the server so the abbreviation is not needed when using `/wiki`.',
    usage: '[wiki abbreviation] [wiki url] [default]',
    guildOnly: true,
    adminOnly: true,
    dmOnly: false,

    //Command code
    async execute(interaction){

        //Try to create an url object out of it
        let wikiURL;
        try{
            wikiURL = new URL(interaction.options.getString('url'));
        } catch {
            return interaction.reply('Please provide a valid url in the format `https://example.com`').catch(console.error);
        }

        //Try to make an api request for the site info.
        //When no response is given, this isn't a valid wiki
        let res;
        let apiPath;
        for(let ap of wikiConfig.apiPaths){
            try{

                //Try to retrieve a response. When it fails, try another api path.
                res = await axios.get(wikiURL.origin + ap, {
                    params: {
                        action: 'query',
                        format: 'json',
                        formatversion: '2',
                        meta: 'siteinfo',
                        redirects: wikiConfig.pageRedirects
                    }
                });

                //When the response isn't accurately returned, try another api path
                if(res.data.query == null)
                    continue;

                apiPath = ap;
                break;

            } catch (e) {
                // console.error(e);
            }
        }

        if(apiPath == null)
            return interaction.reply({content: 'This url doesn\'t correspondent to a valid wiki.', ephemeral: true}).catch(console.error);

        //When the api encountered an error, let the user know
        if(res.data.error){
            console.error(Object.values(response.data.error).join('\n'));
            return interaction.reply({content: 'The wiki is currently not available.', ephemeral: true}).catch(console.error);
        }

        //Assign the site info to a local variable
        const siteInfo = res.data.query.general;

        //When there is no logo available, make another api call to the main page, to see if there is an image with
        //the words 'logo' and/or 'wiki' in it
        if(siteInfo.logo == null){

            try{
                res = await axios.get(wikiURL.origin + apiPath, {
                    params: {
                        action: 'query',
                        format: 'json',
                        formatversion: '2',
                        prop: 'images',
                        redirects: wikiConfig.pageRedirects,
                        titles: 'Main_Page'
                    }
                });
                let images = helper.getValues(res.data.query.pages)[0].images;

                if(images != null){
                    let logo;
                    let logos = images.filter(image => image.title.toLowerCase().includes('logo'));

                    //If an image can be found with 'wiki' in it, it takes precedence
                    if(logos.some(i => i.title.toLowerCase().includes('wiki')))
                        logo = images.find(image => image.title.toLowerCase().includes('wiki'));
                    else
                        logo = logos[0];

                    //When really no image can be found, use the first image
                    if(images.length)
                        logo = images[0];

                    //When an image is found, continue to retrieve it's url
                    if(logo){

                        try{
                            const response = await axios.get(wikiURL.origin + apiPath, {
                                params: {
                                    action: 'query',
                                    format: 'json',
                                    formatversion: '2',
                                    prop: 'imageinfo',
                                    iiprop: 'url',
                                    titles: logo.title
                                }
                            });

                            if(!response.data.error) {
                                siteInfo.logo = helper.getValues(response.data.query.pages)[0].imageinfo[0].url;
                            }
                        }
                        catch(e) {
                            console.error(e);
                        }
                    }
                }
            } catch(e){
                console.error(e)
            }
        }


        //Try to create a new entry for the wiki
        let msg;
        const def = interaction.options.getBoolean('default');
        try{
            //Create an entry for the guild if it doesn't exist yet
            await db.query('insert into guild(id) values($1)' +
                ' ON conflict (id) do UPDATE set id = $1',
                [interaction.guild.id]);

            //When this wiki should be set as the default, set all other defaults to false
            if(def){
                await db.query('update wiki set "default" = $1 where guild_id = $2', [false, interaction.guild.id])
            }

            //Add/update the wiki
            await db.query(
                'insert into wiki(guild_id, abbreviation, url, logo, name, api_path, "default") values($1,$2,$3,$4,$5,$6,$7)' +
                ' on conflict on constraint wiki_un do update set guild_id = $1, abbreviation = $2, url = $3, logo = $4, name = $5, api_path = $6, "default" = $7',
                [interaction.guild.id, interaction.options.getString('abbreviation'), wikiURL.origin, siteInfo.logo || wikiConfig.logo, siteInfo.sitename, apiPath, def]
            );
            msg = {content: 'The \''+siteInfo.sitename+'\' wiki has been added/updated!' +
                '\nDo `/list` to see all available wikis.', ephemeral: true};
        }
        catch(e) {
            msg = embed.createErrorEmbed();
            console.error(e)
        }

        interaction.reply(msg).catch(console.error)
    }
};