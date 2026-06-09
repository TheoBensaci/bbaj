/**
 * @ Autheur: Theo Bensaci
 * @ Date: 17:45 18.05.2026
 * @ Description: The UI manager is use to switch ui sceen
 * thoses are define in the index page with the class 'uiSceen'
 *
 * uiSceen are superpose on eatch other, normaly we avoid using multiple sceen at once, but we can.
 * This aim to avoid the need of recreating mutiple ui element, like for exemple a debug console (which will the same no mater the ui context)
 */

export class UiManager{
    /**
     * UI manager
     * @param {Node} sceenContainer Ui container
     * @param {Node} transition transition node
     */
    constructor(sceenContainer, transition) {
        // get all sceen
        this.sceen = sceenContainer.getElementsByClassName('uiSceen');
        this.transitionNode = transition;
        this.transitionNode.addEventListener('animationend', (event) => {
            this.transitionNode.hidden = true;
            this.transitionNode.classList.remove('showTransi');
        });
        this.menuStateStack=[];
        this.clear();
    }

    /**
     * Show a sceen (hidden = false)
     * @param {string} id
     */
    toggle(id, state = true) {
        for (const iterator of this.sceen) {
            if (iterator.id === id) {
                this.#toggleScreen(iterator,state);
            }
        }
    }


    setOnOpen(id,callback){
        for (const iterator of this.sceen) {
            if (iterator.id === id) {
                iterator.onOpen=callback;
            }
        }
    }

    #toggleScreen(node,state){
        if (state) {
            node.classList.add('uiShow');
            node.classList.remove('uiHide');
            node.hidden = false;
            if(node.onOpen)node.onOpen();
        } else {
            node.classList.remove('uiShow');
            node.classList.add('uiHide');
            node.hidden = true;
        }
        void node.offsetWidth;
    }

    /**
     * Get a screen state (hide or show)
     * @param {string} id if of the screen
     * @returns if this screen is showned
     */
    getScreenState(id){
        for (const iterator of this.sceen) {
            if (iterator.id === id) {
                return iterator.classList.contains('uiShow');
            }
        }
        return false;
    }

    /**
     * Push a new UI state, use full for menu navigation
     */
    pushState(){
        const buffer = [];
        for (const iterator of this.sceen) {
            buffer[iterator.id]=iterator.classList.contains('uiShow');
        }
        this.menuStateStack.push(buffer);
    }

    /**
     * Pop a UI state, index = index of the ui state in stack we want to reatch, if index < 0 => clear the screen
     * @param {*} index
     * @returns
     */
    popState(index = this.menuStateStack.length-2){
        if(this.menuStateStack.length===1 || index<0){
            this.clear();
            return;
        }
        const buffer = this.menuStateStack[index];
        for (const iterator of this.sceen) {
            this.#toggleScreen(iterator,buffer[iterator.id]);
        }
        this.menuStateStack.splice(index+1,this.menuStateStack.length-index);

        document.activeElement.blur();
    }

    /**
     * clear all ui and reste the menu state stack
     */
    clear() {
        for (const iterator of this.sceen) {
            iterator.classList.remove('uiShow');
            iterator.classList.add('uiHide');
            iterator.hidden = true;
        }
        this.menuStateStack=[];
        document.activeElement.blur();
    }

    /**
     * Call a transition
     * @param {fonction} callback callback invoke in the middle of the transition animation, so, during the moment of transition
     */
    transition(callback) {
        setTimeout(() => {
            callback();
        }, 500);
        this.transitionNode.hidden = false;
        this.transitionNode.classList.remove('showTransi');
        void this.transitionNode.offsetWidth;
        this.transitionNode.classList.add('showTransi');
    }
}
