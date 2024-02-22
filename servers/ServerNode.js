import {config} from '../config.js'
import {create_append_add_classes} from '../helpers.js'

function setClipboard(text) {
    const type = "text/plain";
    const blob = new Blob([text], { type });
    const data = [new ClipboardItem({ [type]: blob })];
  
    navigator.clipboard.write(data).then(
      () => {
        /* success */
      },
      () => {
        /* failure */
      },
    );
  }

class ServerNode{
    constructor(server_id,server_data){
        this.id = server_id
        this.data = server_data
        this.hidden = false
        this.create()
    }
    set_hidden(should_be_hidden){
        if(should_be_hidden && !this.hidden){
            this.hidden = true
            this.element.style.display = "none"
        }else if(!should_be_hidden && this.hidden){
            this.hidden = false
            this.element.style.display = "block"
        }
    }
    cache_details(){
        //cache details for detailed view and fast filtering and sorting
        //all values used in filters should be strings or an array of strings,
        this.details = {
            name:this.data.name,
            tags:this.data.tags || [],
            player_count:this.player_count
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
    get_html_element(){
        return this.element
    }
    create(){
        this.update(this.data)
    }
    get is_online(){
        return (Date.now() - this.data.last_alive_ts) < (1000*60*60)
    }
    get player_count(){
        if(this.data?.player_maps){
            return Object.keys(this.data?.player_maps).length
        }
        return 0
    }
    update(latest_mod_data){
        this.data = latest_mod_data
        this.cache_details()
        if(!this.element){
            this.element = document.createElement('div')
            this.element.style.backgroundColor = this.data.color
        }
        //clear class list
        this.element.classList.remove(...this.element.classList);
        this.element.classList.add("server");

        //dark overlay
        if(!this.dark_overlay){
            this.dark_overlay = create_append_add_classes('div',this.element,["dark_overlay"])
        }

        //preview window
        if(!this.preview_window){
            this.preview_window = create_append_add_classes('p',this.dark_overlay,["preview_window","disable_selection"])
        }
        //-->In preview window
        if(!this.chip_preview){
            this.chip_preview = create_append_add_classes('img',this.preview_window,["chip_preview"])
        }
        this.chip_preview.src = `${config.api_url}/server_images/${this.id}.png`


        //description window
        if(!this.description_window){
            this.description_window = create_append_add_classes("p",this.dark_overlay,["description_window"])
        }
        //-->In description window
        if(!this.p_name){
            this.p_name = create_append_add_classes("p",this.description_window,["name"])
        }
        this.p_name.textContent = this.data.name

        if(!this.p_description){
            this.p_description = create_append_add_classes("p",this.description_window,["description"])
        }
        this.p_description.textContent = this.data.description

        if(!this.pre_address){
            this.pre_address = create_append_add_classes("pre",this.description_window,["address"])
        }
        this.pre_address.textContent = this.data.address
        //-->In description window--> in address bar
        //this is jank, but because we update the this.pre_address.textContent we have to recreate the button each time
        this.btn_copy_address = create_append_add_classes("button",this.pre_address,[])
        this.btn_copy_address.textContent = "copy address"
        this.btn_copy_address.onclick = ()=>{
            setClipboard(this.data.address)
            this.btn_copy_address.textContent = "copied!"
            setTimeout(()=>{
                this.btn_copy_address.textContent = "copy address"
            },1000)
        }
        //-->In description window--> in address bar
        //jack in button form
        this.a_jack_in = create_append_add_classes("a",this.pre_address,["jack_in_button"])
        this.a_jack_in.textContent = "Jack In!"
        if(this.is_online){
            this.a_jack_in.hidden = false
            let address = this.data.address.split(":")[0]
            let port = this.data.address.split(":")[1]
            let data = this.data.data
            this.a_jack_in.href = `onb://jackin?address=${address}&port=${port}&data=${data}`
        }else{
            this.a_jack_in.hidden = true
        }
         //status box
        if(!this.div_status_box){
            this.div_status_box = create_append_add_classes("div",this.dark_overlay,["status"])
        }
        //in status box
        if(!this.p_online_status){
            this.p_online_status = create_append_add_classes("p",this.div_status_box,["online_status"])
        }
        //clear class list
        this.p_online_status.classList.remove(...this.p_online_status.classList);
        this.p_online_status.classList.add("online_status");
        if(this.is_online){
            this.p_online_status.classList.add("online")
            this.p_online_status.textContent = "ONLINE"
        }else{
            this.p_online_status.classList.add("offline")
            this.p_online_status.textContent = "OFFLINE"
        }

        //status, player count
        if(!this.p_online_players){
            this.p_online_players = create_append_add_classes("p",this.div_status_box,["online_players"])
        }
        this.p_online_players.textContent = `players: ${this.player_count}`
        if(this.is_online){
            this.p_online_players.hidden = false
        }else{
            this.p_online_players.hidden = true
        }

   
    }
}

export default ServerNode