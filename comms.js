const config = require('./config.json');
const ytdl = require('ytdl-core');
const { MessageActionRow, MessageButton } = require('discord.js');
const Discord = require('discord.js');
const guilds = require("./guilds.json");
const {createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, AudioPlayer, AudioResource} = require("@discordjs/voice");
const {player, connection} = require("./audioPlayer");
const yts = require("yt-search");

function generate_button(robot, mess, args) {
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('createChannel')
                .setLabel('Создать заказ')
                .setStyle('SECONDARY')
        );
    mess.channel.send({content: 'Нажмите на кнопку ниже, чтобы создать заказ', components: [row]});
    mess.delete();
}
async function review(robot, mess, args) {
    if (mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name === config.seller_role)) {

        const repliedTo = await mess.channel.messages.fetch(mess.reference.messageId);
        console.log(args);
        let channel = mess.channel.name.split('_')[1];
        let embed = new Discord.MessageEmbed()
            .setColor("#00ff00")
            .setTitle("Заказ №"+channel);
        if(repliedTo.content && args.indexOf(config.flag_content) === -1) embed.addField("Отзыв:", `${repliedTo.content}`)
        if(repliedTo.attachments && args.indexOf(config.flag_image) === -1) {
            repliedTo.attachments.forEach(attachment => {
                embed.setImage(attachment.proxyURL);
            });
        }
        let quote = await require('axios').get('https://api.forismatic.com/api/1.0/?method=getQuote&format=json');
        embed.setFooter({text: `${quote.data.quoteText}`, iconURL: `https://cdn.discordapp.com/icons/818143875440181258/516ef1b8592f4a3207e52c2068a1c4bc.webp?size=128`})
        mess.guild.channels.cache.get(config.review_channel).send({embeds: [embed]});
        mess.delete();
    }
}
async function close(robot, mess, args) {
    console.log(mess);
    if (mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name === config.seller_role)) {
        await mess.guild.roles.cache.find(role => role.name === mess.guild.channels.cache.get(mess.channelId).name).delete();
        if(mess.guild.channels.cache.get(mess.channelId)) await mess.guild.channels.cache.get(mess.channelId).delete();

        guilds.find(x => x.id === mess.guildId).orders.splice(guilds.find(x => x.user.id === mess.user.id), 1);
    }
    else mess.delete();
}
function clear_all_order_chats(robot, mess, args) {
    let guilds = require('./guilds.json');
    if (mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) {
        console.log(robot)
        for(let i = 0; i < guilds.find(x => x.id === mess.guildId).orders.length; i++) {
            if(mess.guild.channels.cache.find(x=> x.name === `заказ_${i}`)) mess.guild.channels.cache.find(x=> x.name === `заказ_${i}`).delete();
            if(mess.guild.roles.cache.find(x=> x.name === `заказ_${i}`)) mess.guild.roles.cache.find(x=> x.name === `заказ_${i}`).delete();

        }
        guilds.find(x => x.id === mess.guildId).orders = [];
        require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    }
    else mess.delete();
}
function generateContextMenu(robot, mess, args) {
    mess.guild.commands.create({
        name: "contextuser",
        type: "USER"
    })

    mess.guild.commands.create({
        name: "Отзыв",
        type: "MESSAGE"
    })
    mess.reply("Контекстное меню настроено");
}

function setReview(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    guilds.find(x => x.id === mess.guildId).settings.review_channel = mess.channelId;
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function setPrice(robot, mess, args){
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    let guilds = require('./guilds.json');
    guilds.find(x => x.id === mess.guildId).settings.price_channel = mess.channelId;
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function setSellerRole(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    guilds.find(x => x.id === mess.guildId).settings.seller_role = args[0];
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function setPrefix(robot, mess, args){
    let guilds = require('./guilds.json');
    if((mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) && mess.author.id !== '283240289211252737') return mess.delete();
    guilds.find(x => x.id === mess.guildId).settings.prefix = args[0];
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function setOrder(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    guilds.find(x => x.id === mess.guildId).settings.orders_channel = mess.channelId;
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function add_category(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    if(guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0])) mess.reply({content: 'Данная категория уже существует. Выберите другую'})
    else guilds.find(x => x.id === mess.guildId).items.push({
        label: args[0],
        description: args[1],
        items: []
    });

    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.delete();
}
function remove_category(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        guilds.find(x => x.id === mess.guildId).items.splice(guilds.find(x => x.id === mess.guildId).items.indexOf(x=> x.label === args[0]), 1);
        mess.reply({content: `Категория ${cat.label} успешно удалена!`})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function rename_category(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        if(guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[1])) mess.reply({content: 'Данная категория уже существует. Выберите другую'})
        else {
            mess.reply({content: `Категория ${cat.label} успешно переименована в ${args[1]}!`})
            guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]).label = args[1];
        }
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function add_item(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        let item = cat.items.find(x=> x.label === args[1]);
        if(item) mess.reply({ content: `Предмет с именем ${args[1]} уже существует в данной категории`})
        else {
            if(!args[2]) return mess.reply('Требуется ввести цену!');
            let ar = args[2].split(' ').join('').split(',');
            if(ar.length !== 1) {
                let price = [];
                for(let i in ar) {
                    price.push({
                        max: Number(ar[i].split('-')[0]),
                        price: Number(ar[i].split('-')[1])
                    });
                }
                cat.items.push({
                    label: args[1],
                    description: args[3],
                    price: price
                })
                mess.reply({content: `Предмет ${args[1]} добавлен в категорию ${args[0]}!`, ephemeral: true})
            }
            else {
                cat.items.push({
                    label: args[1],
                    description: args[3],
                    price: Number(ar[0].split('-')[1]) ? Number(ar[0].split('-')[1]) : Number(ar[0].split('-')[0])
                })
                mess.reply({content: `Предмет ${args[1]} добавлен в категорию ${args[0]}!`, ephemeral: true})
            }
        }
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function remove_item(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        let item = cat.items.findIndex(x=> x.label === args[1]);
        if(item > -1) {
            cat.items.splice(item, 1);
            mess.reply({content: `Предмет ${args[1]} успешно удалён из категории ${args[0]}!`, ephemeral: true})
        }
        else mess.reply({content: `Предмет ${args[1]} не найден в категории ${args[0]}!`, ephemeral: true})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function set_category_description(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        cat.description = args[1];
        mess.reply({ content: `Описание предмета изменено`})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function set_category_step(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        if(!args[1]) return mess.reply('Требуется ввести шаг!');
        let ar = args[1].split(' ').join('').split(',');
        if(ar.length !== 0) {
            let step = [];
            for(let i in ar) step.push(Number(ar[i]));
            cat.step = step;
            mess.reply({content: `Шаг категории ${args[0]} успешно изменён!`, ephemeral: true})
        }
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function set_item_description(robot, mess, args){
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();
    console.log(args)
    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        let item = cat.items.find(x=> x.label === args[1]);
        if(item) {
            item.description = args[2];
            mess.reply({ content: `Описание предмета изменено`})
        }
        else mess.reply({ content: `Предмет с именем ${args[1]} не существует в данной категории`})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function rename_item(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        let item = cat.items.find(x=> x.label === args[1]);
        if(item) {
            item.label = args[2];
            mess.reply({ content: `Предмет ${args[1]} переименован в ${args[2]}`})
        }
        else mess.reply({ content: `Предмет с именем ${args[1]} не существует в данной категории`})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function reprice_item(robot, mess, args){
    if(!args) return;
    let guilds = require('./guilds.json');
    if(mess.member.permissions.has("ADMINISTRATOR") === false || !mess.guild.members.cache.get(mess.author.id).roles.cache.find(role => role.name ===  guilds.find(x => x.id === mess.guildId).settings.seller_role)) return mess.delete();

    let cat = guilds.find(x => x.id === mess.guildId).items.find(x=> x.label === args[0]);
    if(cat) {
        let item = cat.items.find(x=> x.label === args[1]);
        if(item) {
            if(!args[2]) return mess.reply('Требуется ввести цену!');
            let ar = args[2].split(' ').join('').split(',');
            if(ar.length !== 1) {
                let price = [];
                for(let i in ar) {
                    price.push({
                        max: ar[i].split('-')[0] === '' ? 999999999 : Number(ar[i].split('-')[0]),
                        price: ar[i].split('-')[0] === '' ? Number(ar[i].split('-')[2]) : Number(ar[i].split('-')[1])
                    });
                }
                item.price = price;
                mess.reply({content: `Прайс-лист предмета ${args[1]} успешно изменён!`, ephemeral: true})
            }
            else {
                item.price = Number(ar[0].split('-')[1]) ? Number(ar[0].split('-')[1]) : Number(ar[0].split('-')[0])
                mess.reply({content: `Цена на предмет ${args[1]} успешно изменена!`, ephemeral: true})
            }
        }
        else mess.reply({ content: `Предмет с именем ${args[1]} не существует в данной категории`})
    }
    else mess.reply({content: `Категория ${args[0]} не найдена!`, ephemeral: true})
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
async function help(robot, mess, args) {
    let inline = true
    let embed = new Discord.MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Помощь по командам")
    if (args.length !== 0) {
        for (let i in args) {
            let com = comms_list.find(x => x.name === args[i]);
            if (com) embed.addField(`${guilds.find(x => x.id === mess.guildId).settings.prefix}${com.name}`, `${com.about}`, inline)
        }
    } else {
        for (let i in comms_list) {
            let com = comms_list[i];
            embed.addField(`${guilds.find(x => x.id === mess.guildId).settings.prefix}${com.name}`, `${com.about}`, inline)
        }
    }
    let quote = await require('axios').get('https://api.forismatic.com/api/1.0/?method=getQuote&format=json');
    embed.setFooter({
        text: `${quote.data.quoteText}`,
        iconURL: `https://cdn.discordapp.com/icons/818143875440181258/516ef1b8592f4a3207e52c2068a1c4bc.webp?size=128`
    })
    mess.channel.send({embeds: [embed]});
}

//

async function execute(robot, mess, args) {
    var cookie  = "VISITOR_INFO1_LIVE=mOKeW1BC23Q; PREF=tz=Europe.Kiev&f6=40000000&f5=30000; YSC=7CowTBMROnI; SID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1KnGftSzmyte__Mpf6O3r-A.; __Secure-1PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1wr3RjdrpOfV3qwd1WAmSCw.; __Secure-3PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1_ptQDrxB54YbneASDTqPmg.; HSID=Adya8E0u5zIhZN9hP; SSID=A5gvFEfNe4hmmEXhb; APISID=emmgENLsApu71svx/Aqfgt7usl8OI7A-52; SAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-1PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-3PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; LOGIN_INFO=AFmmF2swRAIgKqZUvgxyCuwYuxHMcuPqkkub92_QgEESUCSOxZW9ys8CIGmrU32-3YvXVacru7FmNJ42CGLeqNHyYCMZjBHaNIll:QUQ3MjNmelVmQVRLc2Q4WTlTMnUyTEpDREl2VXhtR0VLU0E4UHROOV9zY1NKSnBMZ25BRExfWW5oSlNkc0U4MmRzR2lVcDFEWlhxT3lYTlkzbDd6aXNzNkE5YVo0eGF2OGFpdkd4X1Zoc09ic2MyNUFRSUtaSUMxQWJsdTJtTWxnbjJHOVFUYmRySk4yb2dDbWxsZmxqeXAySGJFazBZeXJ3; SIDCC=AJi4QfHUt1Opv8LyjeQusLENhkK3q3HJM0z-QTutKFgaevBUJOWqjZic9AgmNYb0UNB7IOIcDZU; __Secure-3PSIDCC=AJi4QfEHfYYGGG4V7Abt4_9LSxqU0b5V21-t3OK9WH-gg-fxQ3UgNMIl62Gs2d_DwxKebNoJ_Q";
    const voiceChannel = mess.member.voice.channel;
    if (!voiceChannel) return mess.channel.send('You need to be in a voice channel to play music!');
    if(args.length === 0) {
        let {player, connection} = require('./audioPlayer');
        if(player.state.status === 'idle') {
            let guilds = require('./guilds.json');
            connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: mess.guild.id,
                    adapterCreator: mess.guild.voiceAdapterCreator
                });
            connection.subscribe(player);
            const stream = ytdl(guilds.find(x => x.id === mess.guildId).queue[0].url+"&has_verifed=1", {filter: 'audioonly'})
            const resource = createAudioResource(stream);
            player.play(resource)
            let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(`${guilds.find(x => x.id === mess.guildId).queue[0].title}`).setURL(guilds.find(x => x.id === mess.guildId).queue[0].url).setAuthor({ name: 'Сейчас играет' }).setThumbnail(guilds.find(x => x.id === mess.guildId).queue[0].thumbnail).setFooter({text: `Added by ${guilds.find(x => x.id === mess.guildId).queue[0].added_by.tag}`, iconURL: guilds.find(x => x.id === mess.guildId).queue[0].added_by.avatarURL});
            mess.channel.send({embeds: [embed]})
        }
        return;
    }
    let url = args.join(" ");
    if(!ytdl.validateURL(url)) {
        const yts = require("yt-search");
        const {videos} = await yts(args.join(" "));
        if (!videos.length) return mess.channel.send("No songs were found!");
        url = videos[0].url
    }
    try {

        let stream = ytdl(url+"&has_verifed=1", {filter: 'audioonly',
            requestOptions: {
                headers: {
                    "x-client-data": "CKW1yQEIlLbJAQimtskBCMS2yQEIqZ3KAQj3+soBCOryywEInvnLAQjW/MsBCOaEzAEI0o/MAQjakMwBCMqTzAEIh5bMARirqcoBGI6eywE=",
                    "x-youtube-identity-token": 3314859,
                    Cookies: cookie
                }
            }})
        const info = await ytdl.getInfo(url);
        let {player} = require('./audioPlayer');
        const resource = createAudioResource(stream);
        let connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: mess.guild.id,
            adapterCreator: mess.guild.voiceAdapterCreator
        });
        let guilds = require('./guilds.json');
        if(guilds.find(x => x.id === mess.guildId).queue.length === 0) {
            player.play(resource);
            let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(info.videoDetails.title).setURL(info.videoDetails.video_url).setAuthor({ name: 'Сейчас играет' }).setThumbnail(info.videoDetails.thumbnails[0].url).setFooter({text: `Added by ${mess.author.tag}`, iconURL: mess.author.avatarURL()});
            mess.channel.send({embeds: [embed]})
        }
        else if(player.state.status === 'idle') {
            //var cookie  = "VISITOR_INFO1_LIVE=mOKeW1BC23Q; PREF=tz=Europe.Kiev&f6=40000000&f5=30000; YSC=7CowTBMROnI; SID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1KnGftSzmyte__Mpf6O3r-A.; __Secure-1PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1wr3RjdrpOfV3qwd1WAmSCw.; __Secure-3PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1_ptQDrxB54YbneASDTqPmg.; HSID=Adya8E0u5zIhZN9hP; SSID=A5gvFEfNe4hmmEXhb; APISID=emmgENLsApu71svx/Aqfgt7usl8OI7A-52; SAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-1PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-3PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; LOGIN_INFO=AFmmF2swRAIgKqZUvgxyCuwYuxHMcuPqkkub92_QgEESUCSOxZW9ys8CIGmrU32-3YvXVacru7FmNJ42CGLeqNHyYCMZjBHaNIll:QUQ3MjNmelVmQVRLc2Q4WTlTMnUyTEpDREl2VXhtR0VLU0E4UHROOV9zY1NKSnBMZ25BRExfWW5oSlNkc0U4MmRzR2lVcDFEWlhxT3lYTlkzbDd6aXNzNkE5YVo0eGF2OGFpdkd4X1Zoc09ic2MyNUFRSUtaSUMxQWJsdTJtTWxnbjJHOVFUYmRySk4yb2dDbWxsZmxqeXAySGJFazBZeXJ3; SIDCC=AJi4QfHUt1Opv8LyjeQusLENhkK3q3HJM0z-QTutKFgaevBUJOWqjZic9AgmNYb0UNB7IOIcDZU; __Secure-3PSIDCC=AJi4QfEHfYYGGG4V7Abt4_9LSxqU0b5V21-t3OK9WH-gg-fxQ3UgNMIl62Gs2d_DwxKebNoJ_Q";
            const stream = ytdl(guilds.find(x => x.id === mess.guildId).queue[0].url+"&has_verifed=1", {filter: 'audioonly', requestOptions: {
                    headers: {
                        "x-client-data": "CKW1yQEIlLbJAQimtskBCMS2yQEIqZ3KAQj3+soBCOryywEInvnLAQjW/MsBCOaEzAEI0o/MAQjakMwBCMqTzAEIh5bMARirqcoBGI6eywE=",
                        "x-youtube-identity-token": 3314859,
                        Cookies: cookie
                    }
                }})
            const resource = createAudioResource(stream);
            player.play(resource)
            let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(guilds.find(x => x.id === mess.guildId).queue[0].title).setURL(guilds.find(x => x.id === mess.guildId).queue[0].url).setAuthor({ name: 'Сейчас играет' }).setThumbnail(guilds.find(x => x.id === mess.guildId).queue[0].thumbnail).setFooter({text: `Added by ${guilds.find(x => x.id === mess.guildId).queue[0].added_by.tag}`, iconURL: guilds.find(x => x.id === mess.guildId).queue[0].added_by.avatarURL});
            mess.channel.send({embeds: [embed]})
        }
        else {
            let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(info.videoDetails.title).setURL(info.videoDetails.video_url).setAuthor({ name: 'Добавлено в очередь' }).setThumbnail(info.videoDetails.thumbnails[0].url).setFooter({text: `Added by ${mess.author.tag}`, iconURL: mess.author.avatarURL()});
            mess.channel.send({embeds: [embed]})
        }
        guilds.find(x => x.id === mess.guildId).queue.push({
            url: info.videoDetails.video_url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            added_by: mess.author
        })
        require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
        connection.subscribe(player);
    }
        catch (e) {
            console.log(`Error ${e.statusCode}`);
            mess.channel.send(`Error ${e.statusCode}`)
        }


        player.on(AudioPlayerStatus.Idle, ()=> {
            guilds.find(x => x.id === mess.guildId).queue.splice(0, 1);
            if(guilds.find(x => x.id === mess.guildId).queue.length > 0) {
                const stream = ytdl(guilds.find(x => x.id === mess.guildId).queue[0].url+"&has_verifed=1", {filter: 'audioonly', requestOptions: {
                        headers: {
                            "x-client-data": "CKW1yQEIlLbJAQimtskBCMS2yQEIqZ3KAQj3+soBCOryywEInvnLAQjW/MsBCOaEzAEI0o/MAQjakMwBCMqTzAEIh5bMARirqcoBGI6eywE=",
                            "x-youtube-identity-token": 3314859,
                            Cookies: cookie
                        }
                    }})
                const resource = createAudioResource(stream);
                player.play(resource)
                let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(guilds.find(x => x.id === mess.guildId).queue[0].title).setURL(guilds.find(x => x.id === mess.guildId).queue[0].url).setAuthor({ name: 'Сейчас играет' }).setThumbnail(guilds.find(x => x.id === mess.guildId).queue[0].thumbnail);
                mess.channel.send({embeds: [embed]})
            }
            require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
        })
    player.on(AudioPlayerStatus.Playing, () => {

        })
    player.on("error", () => console.log('Error'));
}

function skip(robot, mess, args) {
    const voiceChannel = mess.member.voice.channel;
    if (!voiceChannel) return mess.channel.send('You need to be in a voice channel to play music!');
    var cookie  = "VISITOR_INFO1_LIVE=mOKeW1BC23Q; PREF=tz=Europe.Kiev&f6=40000000&f5=30000; YSC=7CowTBMROnI; SID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1KnGftSzmyte__Mpf6O3r-A.; __Secure-1PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1wr3RjdrpOfV3qwd1WAmSCw.; __Secure-3PSID=GQgQKbWlqaD_ufGvnPoGXE3OWLo58qgbLO9NQL9c9j156BM1_ptQDrxB54YbneASDTqPmg.; HSID=Adya8E0u5zIhZN9hP; SSID=A5gvFEfNe4hmmEXhb; APISID=emmgENLsApu71svx/Aqfgt7usl8OI7A-52; SAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-1PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; __Secure-3PAPISID=sI43WkEn66X0Wy9W/AOcQSh1bXLbJyByit; LOGIN_INFO=AFmmF2swRAIgKqZUvgxyCuwYuxHMcuPqkkub92_QgEESUCSOxZW9ys8CIGmrU32-3YvXVacru7FmNJ42CGLeqNHyYCMZjBHaNIll:QUQ3MjNmelVmQVRLc2Q4WTlTMnUyTEpDREl2VXhtR0VLU0E4UHROOV9zY1NKSnBMZ25BRExfWW5oSlNkc0U4MmRzR2lVcDFEWlhxT3lYTlkzbDd6aXNzNkE5YVo0eGF2OGFpdkd4X1Zoc09ic2MyNUFRSUtaSUMxQWJsdTJtTWxnbjJHOVFUYmRySk4yb2dDbWxsZmxqeXAySGJFazBZeXJ3; SIDCC=AJi4QfHUt1Opv8LyjeQusLENhkK3q3HJM0z-QTutKFgaevBUJOWqjZic9AgmNYb0UNB7IOIcDZU; __Secure-3PSIDCC=AJi4QfEHfYYGGG4V7Abt4_9LSxqU0b5V21-t3OK9WH-gg-fxQ3UgNMIl62Gs2d_DwxKebNoJ_Q";
    const {player} = require('./audioPlayer');
    player.stop();
    guilds.find(x => x.id === mess.guildId).queue.splice(0, 1);
    if(guilds.find(x => x.id === mess.guildId).queue.length > 0) {
        const stream = ytdl(guilds.find(x => x.id === mess.guildId).queue[0].url+"&has_verifed=1", {filter: 'audioonly', requestOptions: {
                headers: {
                    "x-client-data": "CKW1yQEIlLbJAQimtskBCMS2yQEIqZ3KAQj3+soBCOryywEInvnLAQjW/MsBCOaEzAEI0o/MAQjakMwBCMqTzAEIh5bMARirqcoBGI6eywE=",
                    "x-youtube-identity-token": 3314859,
                    Cookies: cookie
                }
            }})
        const resource = createAudioResource(stream);
        player.play(resource)
        let embed = new Discord.MessageEmbed().setColor("#c1389a").setTitle(guilds.find(x => x.id === mess.guildId).queue[0].title).setURL(guilds.find(x => x.id === mess.guildId).queue[0].url).setAuthor({ name: 'Сейчас играет' }).setThumbnail(guilds.find(x => x.id === mess.guildId).queue[0].thumbnail).setFooter({text: `Added by ${guilds.find(x => x.id === mess.guildId).queue[0].added_by.tag}`, iconURL: guilds.find(x => x.id === mess.guildId).queue[0].added_by.avatarURL});
        mess.channel.send({embeds: [embed]})
    }
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
}
function clear(robot, mess, args) {
    guilds.find(x => x.id === mess.guildId).queue = []
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    mess.channel.send({content:`Очередь очищена`});
}

function stop(robot, mess, args) {
    const voiceChannel = mess.member.voice.channel;
    if (!voiceChannel) return mess.channel.send('You need to be in a voice channel to play music!');
    const {player} = require('./audioPlayer');
    player.stop();
}
function pause(robot, mess, args) {
    const voiceChannel = mess.member.voice.channel;
    if (!voiceChannel) return mess.channel.send('You need to be in a voice channel to play music!');
    const {player} = require('./audioPlayer');
    player.pause();
}
function unpause(robot, mess, args) {
    const voiceChannel = mess.member.voice.channel;
    if (!voiceChannel) return mess.channel.send('You need to be in a voice channel to play music!');
    const {player} = require('./audioPlayer');
    player.unpause();
}

async function check_queue(robot, mess, args) {
    let queue = guilds.find(x => x.id === mess.guildId).queue;
    let embed = new Discord.MessageEmbed().setColor("#0099ff").setTitle(`Очередь`);
    if(queue.length === 0) {
        embed.setDescription(`Очередь пуста`)
        let quote = await require('axios').get('https://api.forismatic.com/api/1.0/?method=getQuote&format=json');
        embed.setFooter({
            text: `${quote.data.quoteText}`,
            iconURL: `https://cdn.discordapp.com/icons/818143875440181258/516ef1b8592f4a3207e52c2068a1c4bc.webp?size=128`
        })
        return mess.channel.send({embeds: [embed]});
    }
    const {player} = require('./audioPlayer');
    if(player.state.status === 'playing') embed.addField(`Сейчас играет`, `${queue[0].title}`)

    for (let i in queue) {
        if(player.state.status === 'playing' && i === 0) return;
        embed.addField(`${i}`, `${queue[0].title}`)
    }
    let quote = await require('axios').get('https://api.forismatic.com/api/1.0/?method=getQuote&format=json');
    embed.setFooter({
        text: `${quote.data.quoteText}`,
        iconURL: `https://cdn.discordapp.com/icons/818143875440181258/516ef1b8592f4a3207e52c2068a1c4bc.webp?size=128`
    })
    mess.channel.send({embeds: [embed]});
}

///
    var comms_list = [
        {
            name: "generate_button",
            out: generate_button,
            about: "Комадна, для генерации кнопки заказа"
        },
        {
            name: "close",
            out: close,
            about: "Команда для закрытия чата с заказом"
        },
        {
            name: 'clear_all_order_chats',
            out: clear_all_order_chats,
            about: 'Команда, для отчистки всех заказов и ролей'
        },
        {
            name: 'отзыв',
            out: review,
            about: 'Команда, для оставления отзыва. Использование: Ответить на сообщение пользователя командой !отзыв, либо ПКМ-> Apps-> отзыв'
        },
        {
            name: 'тест',
            out: generateContextMenu,
            about: 'Команда для генерации Контекстного меню'
        },
        {
            name: 'review',
            out: setReview,
            about: `Команда для установки чата для отзывов. Использование: !review в чате для отзывов`
        },
        {
            name: 'price',
            out: setPrice,
            about: 'Команда для установки чата для прайс-листа. Использование: !price в чате для прайс-листа'
        },
        {
            name: 'orders',
            out: setOrder,
            about: 'Команда для установки чата для заказов. Использование: !orders в чате для прайс-листа'
        },
        {
            name: 'setrole',
            out: setSellerRole,
            about: 'Команда для установки роли продавца. Использование: !setrole "Роль продавца"'
        },
        {
            name: 'setprefix',
            out: setPrefix,
            about: 'Команда для изменение префикса бота. Использование: !setprefix "Префикс"'
        },
        {
            name: 'add_category',
            out: add_category,
            about: 'Команда для создания категории. Использование: !add_category "Категория"'
        },
        {
            name: 'remove_category',
            out: remove_category,
            about: 'Команда для удаления категории. Использование: !remove_category "Категория"'
        },
        {
            name: 'rename_category',
            out: rename_category,
            about: 'Команда для переименования категории. Использование: !rename_category "Категория" "Новое имя категории"'
        },
        {
            name: 'set_category_step',
            out: set_category_step,
            about: 'Команда для установки шага добавления/уменьшения предмета. Использование: !set_category_step "Категория" "1,5,10"'
        },
        {
            name: 'add_item',
            out: add_item,
            about: 'Команда для добавления нового предмета в категорию. Использование: !add_item "Категория" "Название предмета" "Цена, либо строка цен. Пример: (максимальное число)10-(цена)100, 30-300, 50-450" "Описание (необязательно)"'
        },
        {
            name: 'remove_item',
            out: remove_item,
            about: 'Команда для удаления предмета из категории. Использование: !remove_item "Категория" "Название предмета"'
        },
        {
            name: 'rename_item',
            out: rename_item,
            about: 'Команда для переименования предмета в категории. Использование: !rename_item "Категория" "Название предмета" "Новое название предмета"'
        },
        {
            name: 'reprice_item',
            out: reprice_item,
            about: 'Команда для изменения цены предмета. Использование: !reprice_item "Категория" "Название предмета" "Цена, либо строка цен. Пример: (максимальное число)10-(цена)100, 30-300, 50-450"'
        },
        {
            name: 'set_category_description',
            out: set_category_description,
            about: 'Команда для изменения описания категории. Использование: !set_category_description "Категория" "Описание". Чтобы убрать описание - оставьте поле Описание пустым'
        },
        {
            name: 'set_item_description',
            out: set_item_description,
            about: 'Команда для изменения описания предмета в категории. Использование: !set_item_description "Категория" "Название предмета" "Описание". Чтобы убрать описание - оставьте поле Описание пустым'
        },
        {
            name: 'help',
            out: help,
            about: 'Команда для вызова помощи. Использваония !help "команда" (необязательно)'
        },
        {
            name: 'play',
            out: execute,
            about: 'Хз че'
        },
        {
            name: 'stop',
            out: stop,
            about: 'Хз че'
        },
        {
            name: 'skip',
            out: skip,
            about: 'Хз че'
        },
        {
            name: 'queue',
            out: check_queue,
            about: 'Хз че'
        },
        {
            name: 'pause',
            out: pause,
            about: 'Хз че'
        },
        {
            name: 'unpause',
            out: unpause,
            about: 'Хз че'
        },
        {
            name: 'clear',
            out: clear,
            about: 'Хз че'
        }
    ]

    module.exports.comms = comms_list;
