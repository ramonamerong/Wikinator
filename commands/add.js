//Import modules
const axios = require('axios');
const url = require('url');
const db = require('../personal_modules/database.module.js');

//Import config
const {prefix} = require('../config.json');
const wikiConfig = require('../config.json').commands.wiki;
const helper = require('../personal_modules/helper.module.js');

module.exports = {
    name: 'add',
    shortDesc: 'Add a new wiki to this server.',
    category: 'Wiki - Managing',
    description: 'Use this command to add a wiki to this server. The provided wiki abbreviation can be used in conjunction with the `'+prefix+'wiki` command to search that wiki.' +
        'The wiki url must be of the format `https://example.com`.',
    usage: '[Wiki Abbreviation] [Wiki url]',
    argsOpt: false,
    guildOnly: true,
    adminOnly: true,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args){

        //Check whether a second argument has been given
        if(args[1] == null)
            return message.reply('Please provide a valid url in the format `https://example.com`').catch(console.error);

        //Try to create an url object out of it
        let wikiURL;
        try{
            wikiURL = new URL(args[1]);
        } catch {
            return message.reply('Please provide a valid url in the format `https://example.com`').catch(console.error);
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
            return message.reply('This url doesn\'t correspondent to a valid wiki.').catch(console.error);

        //When the api encountered an error, let the user know
        if(res.data.error){
            console.error(Object.values(response.data.error).join('\n'));
            return message.reply('The wiki is currently not available.').catch(console.error);
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
        try{
            //Create an entry for the guild if it doesn't exist yet
            await db.query('insert into guild(id) values($1)' +
                ' ON conflict (id) do UPDATE set id = $1',
                [message.guild.id]);

            //Add/update the channel
            await db.query(
                'insert into wiki(guild_id, abbreviation, url, logo, name, api_path) values($1,$2,$3,$4,$5,$6)' +
                ' on conflict on constraint wiki_un do update set guild_id = $1, abbreviation = $2, url = $3, logo = $4, name = $5, api_path = $6',
                [message.guild.id, args[0], wikiURL.origin, siteInfo.logo || wikiConfig.logo, siteInfo.sitename, apiPath]
            );
            msg = 'The \''+siteInfo.sitename+'\' wiki has been added/updated!' +
                '\nDo `'+prefix+'list` to see all available wikis.';
        }
        catch(e) {
            msg = 'Something went wrong.';
            console.error(e)
        }

        message.reply(msg).catch(console.error)
    }
};