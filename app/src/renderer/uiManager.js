/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:45 18.05.2026
 * @ Description: The UI manager is use to switch ui sceen
 * thoses are define in the index page with the class "uiSceen"
 *
 * uiSceen are superpose on eatch other, normaly we avoid using multiple sceen at once, but we can.
 * This aim to avoid the need of recreating mutiple ui element, like for exemple a debug console (which will the same no mater the ui context)
 */


export class UiManager{
    /**
     * UI manager
     * @param {Node} sceenContainer Ui container
     * @param {Node} tarnsition transition node
     */
    constructor(sceenContainer,tarnsition){
        // get all sceen
        this.sceen = sceenContainer.getElementsByClassName("uiSceen");
        this.transitionNode = tarnsition;
        this.transitionNode.addEventListener("animationend", (event) => {
            this.transitionNode.hidden=true;
            this.transitionNode.classList.remove("showTransi");
        })
        this.clear();
    }


    /**
     * Show a sceen (hidden = false)
     * @param {string} id
     */
    toggle(id,state=true){
        for (const iterator of this.sceen) {
            if(iterator.id===id){
                if(state){
                    iterator.classList.add("uiShow");
                    iterator.classList.remove("uiHide");
                    iterator.hidden=false;
                }
                else{
                    iterator.classList.remove("uiShow");
                    iterator.classList.add("uiHide");
                    iterator.hidden=true;
                }
                void iterator.offsetWidth;
            }
        }
    }

    /**
     * Hide all sceen
     */
    clear(){
        for (const iterator of this.sceen) {
            iterator.classList.remove("uiShow");
            iterator.classList.add("uiHide");
            iterator.hidden=true;
        }
    }


    /**
     * Call a transition
     * @param {fonction} callback callback invoke in the middle of the transition animation, so, during the moment of transition
     */
    transition(callback){
        setTimeout(()=>{
            callback();
        },500)
        this.transitionNode.hidden=false;
        this.transitionNode.classList.remove("showTransi");
        void this.transitionNode.offsetWidth;
        this.transitionNode.classList.add("showTransi");
    }
}

