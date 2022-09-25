import {display_detail_view_for_mod,hide_detail_view} from './detail_view.js'
import {config} from './config.js'

function create_mod_node(mod_id,mod_data){
    if(mod_data.data.type == "cards"){
        return new CardNode(mod_id,mod_data)
    }else if(mod_data.data.type == "players"){
        return new PlayerNode(mod_id,mod_data)
    }else if(mod_data.data.type == "enemies"){
        return new EnemyNode(mod_id,mod_data)
    }else if(mod_data.data.type == "skins"){
        return new SkinNode(mod_id,mod_data)
    }else if(mod_data.data.type == "blocks"){
        return new BlockNode(mod_id,mod_data)
    }else{
        return new ModNode(mod_id,mod_data)
    }
}

function regex_groups_to_array(reg_exp,string,seperator){
    let res = []
    let match = reg_exp.exec(string)
    while(match !== null) {
        if(seperator){
            let split = match[1].split(seperator)
            res.push(...split)
        }else{
            res.push(match[1])
        }
        match = reg_exp.exec(string);
    }
    return res
}

class ModNode{
    constructor(mod_id,mod_data){
        this.id = mod_id
        this.data = mod_data
        this.hidden = false
        this.selected = false
        this.create()
        this.cache_details()
    }
    selection_changed_callback(){
        console.log('replace this')
    }
    set_selection(should_be_selected){
        if(should_be_selected && !this.selected){
            this.selected = true
            this.element.classList.add('selected')
            this.selection_changed_callback()
        }else if(!should_be_selected && this.selected){
            this.selected = false
            this.element.classList.remove('selected')
            this.selection_changed_callback()
        }
    }
    clicked(){
        hide_detail_view()
        if(!this.selected){
            this.set_selection(true)
        }else{
            this.set_selection(false)
        }
    }
    cache_details(){
        //cache details for detailed view and fast filtering and sorting
        //all values used in filters should be strings or an array of strings,
        this.details = {
            name:String(this.name),
            type:String(this?.data?.data?.type),
            card_class:this.data.data.type == "cards" ?
                this.card_class ?
                    this.card_class : 
                    "standard"
                :null,
            id:String(this?.data?.data?.id),
            card_code:this?.data?.data?.detail?.codes ? 
                this.data.data.detail.codes.map((value)=>{
                return String(value)}) : "",
            element:this.chip_element ?
                this.chip_element : 
                "None",
            author_name:String(this?.data?.attachment_data?.author_name),
            timestamp:parseInt(this?.data?.attachment_data?.timestamp),
            damage:this?.data?.data?.detail?.props?.damage ? parseInt(this?.data?.data?.detail?.props?.damage) : 0,
            tags:this?.data?.attachment_data?.thread_name ? regex_groups_to_array(/\[([^\[\]]*)\]/gm,this.data.attachment_data.thread_name,"|") : []
        }
        //Construct a string with all other details, used for searching all details at once
        let any_search_string = ""
        for(let key in this.details){
            let value = this.details[key]
            if(value == "" || value == null){
                continue
            }
            if(Array.isArray(value)){
                for(let item of value){
                    any_search_string += (item+" ")
                }
            }else{
                any_search_string += (value+" ")
            }
        }
        this.details.any = any_search_string
    }
    set_hidden(should_be_hidden){
        if(should_be_hidden && !this.hidden){
            this.hidden = true
            this.element.style.display = "none"
            this.set_selection(false)
        }else if(!should_be_hidden && this.hidden){
            this.hidden = false
            this.element.style.display = "block"
        }
    }
    get_html_element(){
        return this.element
    }
    create(){
        this.update(this.data)
    }
    open_context_menu(e){
        e.preventDefault()
        hide_detail_view()
        display_detail_view_for_mod(this)
    }
    update(latest_mod_data){
        this.data = latest_mod_data
        if(!this.element){
            this.element = document.createElement('div')
            this.element.onclick = ()=>{
                this.clicked()
            }
            this.element.addEventListener('contextmenu', e => {
                e.preventDefault();
            });
        }
        //clear class list
        this.element.classList.remove(...this.element.classList);
        this.element.classList.add("mod");
        if(!this.p_name){
            this.p_name = document.createElement("p")
            this.p_name.classList.add("name")
            this.element.appendChild(this.p_name)
        }
        this.p_name.textContent = this.name

        if(!this.preview_window){
            this.preview_window = document.createElement('p')
            this.preview_window.classList.add("preview_window")
            this.preview_window.classList.add("disable_selection");
            this.element.appendChild(this.preview_window)
        }
        if(!this.p_description){
            this.p_description = document.createElement("p")
            this.p_description.classList.add("description")
            this.element.appendChild(this.p_description)
        }
        this.p_description.textContent = this.description

        //context menu
        this.element.addEventListener('contextmenu', (e)=>{this.open_context_menu(e)});
        
    }
    get download_link(){
        return this.data?.attachment_data?.discord_url
    }
    get description(){
        if(this.data?.data?.description){
            return this.data?.data?.description
        }
        if(this.data?.data?.detail?.props?.long_description){
            return this.data?.data?.detail?.props?.long_description
        }
        if(this.data?.data?.detail?.props?.description){
            return this.data?.data?.detail?.props?.description
        }
        return this.data.type
    }
    get name(){
        if(this.data?.data?.name){
            return this.data?.data?.name
        }
        if(this.data?.data?.detail?.props?.shortname){
            return this.data?.data?.detail?.props?.shortname
        }
        return this.data.data.id
    }
    get preview_link(){
        return `${config.api_url}/${this.data?.data?.detail?.preview}`
    }
}

class CardNode extends ModNode{
    static damage_text_colors = {
        1:`rgb(255,255,255)`,
        200:`rgb(255, 255, 125)`,
        400:`rgb(255, 120, 120)`,
        600:`rgb(190, 120, 230)`,
        800:`rgb(0, 0, 0)`
    }
    constructor(mod_id,mod_data){
        super(mod_id,mod_data)
    }
    update(latest_mod_data){
        super.update(latest_mod_data)
        if(!this.chip_preview){
            this.chip_preview = document.createElement('img')
            this.chip_preview.classList.add("chip_preview")
            this.preview_window.appendChild(this.chip_preview)
        }
        this.chip_preview.src = this.preview_link

        if(!this.chip_icon){
            this.chip_icon = document.createElement('img')
            this.chip_icon.classList.add("chip_icon")
            this.element.appendChild(this.chip_icon)
        }
        this.chip_icon.src = this.icon_link

        if(!this.element_icon){
            this.element_icon = document.createElement('img')
            this.element_icon.classList.add("element")
            this.element.appendChild(this.element_icon)
        }
        this.element_icon.src = `/images/${this.chip_element}.png`

        if(!this.codes_p){
            this.codes_p = document.createElement('p')
            this.codes_p.classList.add("chip_codes")
            this.element.appendChild(this.codes_p)
        }
        this.codes_p.textContent = this.codes_string.join(" ")

        if(this.damage > 0){
            if(!this.p_damage){
                this.p_damage = document.createElement('p')
                this.p_damage.classList.add("damage")
                this.element.appendChild(this.p_damage)
            }
            for(let threshold in CardNode.damage_text_colors){
                if(this.damage >= Number(threshold)){
                    this.p_damage.style.color = CardNode.damage_text_colors[threshold]
                }
                if(this.damage >= 800){
                    this.p_damage.style.textShadow = `2px 2px 0px rgb(200, 200, 200)`
                }
            }
            this.p_damage.textContent = this.damage
        }

        this.element.classList.add(this.card_class)
    }
    get card_class(){
        if(this.data?.data?.detail?.props?.card_class){
            return this.data?.data?.detail?.props?.card_class
        }
        return "Standard"
    }
    get icon_link(){
        return `${config.api_url}/${this.data?.data?.detail?.icon}`
    }
    get chip_element(){
        return (this.data?.data?.detail?.props?.element || 'none').toLowerCase()
    }
    get codes_string(){
        return (this.data?.data?.detail?.codes || [])
    }
    get damage(){
        let raw_dmg = this.data?.data?.detail?.props?.damage
        if(!raw_dmg){
            return 0
        }
        let damage = Math.floor(Number(raw_dmg))
        return Math.min(9999,damage)
    }
}

class PlayerNode extends ModNode{
    constructor(mod_id,mod_data){
        super(mod_id,mod_data)
    }
    update(latest_mod_data){
        super.update(latest_mod_data)
        if(!this.player_preview){
            this.player_preview = document.createElement('img')
            this.player_preview.classList.add("player_preview")
            this.preview_window.appendChild(this.player_preview)
        }
        this.player_preview.src = this.preview_link
    }
}

class SkinNode extends ModNode{
    constructor(mod_id,mod_data){
        super(mod_id,mod_data)
    }
    update(latest_mod_data){
        super.update(latest_mod_data)
        if(!this.skin_preview){
            this.skin_preview = document.createElement('img')
            this.skin_preview.classList.add("skin_preview")
            this.preview_window.appendChild(this.skin_preview)
        }
        let screenshots = this?.data?.data?.screenshots
        if(screenshots){
            this.skin_preview.src = `${config.api_url}/${screenshots[0]}`
        }
        this.element.classList.add('skin_node')
    }
}

class BlockNode extends ModNode{
    constructor(mod_id,mod_data){
        super(mod_id,mod_data)
    }
    update(latest_mod_data){
        super.update(latest_mod_data)
        if(!this.block_preview){
            this.block_preview = document.createElement('canvas')
            this.block_preview.width = 128
            this.block_preview.height = 128
            this.block_preview.classList.add("block_preview")
            this.preview_window.appendChild(this.block_preview)
        }
        this.element.classList.add('ncp_block')
        this.render_block(this.block_preview)
    }
    render_block(canvas){
        let shape = this.data.data.detail.shape
        let block_color = this.data.data.detail.color
        let is_program = this.data.data.detail?.is_program
        let ctx = canvas.getContext('2d')
        ctx.fillStyle = block_color
        ctx.strokeStyle = "black"
        ctx.clearRect(0,0,canvas.width,canvas.height)
        let nc_width = 5
        let nc_height = 5
        let block_width = canvas.width/nc_width
        let block_height = canvas.height/nc_height
        for(let block_index = 0; block_index < nc_width * nc_height; block_index++){
            let x = block_index % nc_width
            let y = Math.floor(block_index / nc_height)
            if(shape[block_index] == 1){
                let x_pix = x*block_width
                let y_pix = y*block_height
                ctx.fillRect(x_pix,y_pix,block_width,block_height)
                if(!is_program){
                    ctx.strokeStyle = "rgba(0,0,0,0.2)"
                    ctx.strokeRect(x_pix+block_width/2,y_pix,1,block_height)
                    ctx.strokeRect(x_pix,y_pix+block_height/2,block_width,1)
                }
                ctx.strokeStyle = "black"
                ctx.strokeRect(x_pix,y_pix,block_width,block_height)
            }
        }
    }
}


class EnemyNode extends ModNode{
    constructor(mod_id,mod_data){
        super(mod_id,mod_data)
    }
    update(latest_mod_data){
        super.update(latest_mod_data)

        this.element.classList.add("encounter")

        if(!this.enemy_preview){
            this.enemy_preview = document.createElement('img')
            this.enemy_preview.classList.add("enemy_preview")
            this.preview_window.appendChild(this.enemy_preview)
        }
        this.element.classList.add("enemy_node")
        this.enemy_preview.src = this.preview_link
    }
}

export { create_mod_node };