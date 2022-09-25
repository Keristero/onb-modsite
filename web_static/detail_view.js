
class DetailView{
    constructor(){
        this.update({})
        this.details_to_show = {
            'ID':(mod)=>{return mod.details.id},
            'Uploader':(mod)=>{return mod.details.author_name},
            'Thread':(mod)=>{
                let thread_id = mod?.data?.attachment_data?.thread_id
                let guild_id = mod?.data?.attachment_data?.guild_id
                let attachment_id = mod?.data?.attachment_data?.attachment_id
                if(guild_id && thread_id && attachment_id){
                    return `<a href=discord://discord.com/channels/${guild_id}/${thread_id}/${attachment_id} target="_blank">Discord</a>
                    <a href=https://discord.com/channels/${guild_id}/${thread_id}/${attachment_id} target="_blank">Web</a>`
                }
            },
            'Date':(mod)=>{
                return new Date(mod?.data?.attachment_data?.timestamp).toLocaleDateString();
            },
            'Hash':(mod)=>{
                return mod?.data?.data?.hash
            },
            'Tags':(mod)=>{
                let tag_div = ``
                for(let tag of mod.details.tags){
                    tag_div+= `[${tag}] `
                }
                return tag_div
            }
        }
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
    attach_to_element(mod_element){
        if(this.current_parent_element){
            this.current_parent_element.removeChild(this.element)
        }
        this.current_parent_element = mod_element
        this.current_parent_element.appendChild(this.element)
    }
    update(mod){
        this.mod = mod
        if(!this.element){
            this.element = document.createElement('div')
            this.element.classList.add("detail_view");
            this.element.onclick = ()=>{
                hide_detail_view()
            }
        }
        //delete all children the slow way
        this.element.innerHTML = ""
        for(let detail_name in this.details_to_show){
            let detail_p = document.createElement('p')
            let detail_value = this.details_to_show[detail_name](mod)
            if(!detail_value){
                continue
            }
            if(detail_name == "Thread"){
                //this is unsafe to do for other fields...
                detail_p.innerHTML = `${detail_name}: ${detail_value}`
            }else{
                detail_p.innerText = `${detail_name}: ${detail_value}`
            }
            this.element.appendChild(detail_p)
        }
    }
}

const shared_detail_view = new DetailView()
document.body.appendChild(shared_detail_view.element)

function hide_detail_view(){
    shared_detail_view.set_hidden(true)
}

function display_detail_view_for_mod(mod){
    shared_detail_view.attach_to_element(mod.element)
    shared_detail_view.update(mod)
    shared_detail_view.set_hidden(false)
}

export {display_detail_view_for_mod,hide_detail_view}