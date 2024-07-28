(function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	// Adapted from https://github.com/then/is-promise/blob/master/index.js
	// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
	/**
	 * @param {any} value
	 * @returns {value is PromiseLike<any>}
	 */
	function is_promise(value) {
		return (
			!!value &&
			(typeof value === 'object' || typeof value === 'function') &&
			typeof (/** @type {any} */ (value).then) === 'function'
		);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {string} style_sheet_id
	 * @param {string} styles
	 * @returns {void}
	 */
	function append_styles(target, style_sheet_id, styles) {
		const append_styles_to = get_root_for_style(target);
		if (!append_styles_to.getElementById(style_sheet_id)) {
			const style = element('style');
			style.id = style_sheet_id;
			style.textContent = styles;
			append_stylesheet(append_styles_to, style);
		}
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, '');
		}
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	/**
	 * @template T
	 * @param {Promise<T>} promise
	 * @param {import('./private.js').PromiseInfo<T>} info
	 * @returns {boolean}
	 */
	function handle_promise(promise, info) {
		const token = (info.token = {});
		/**
		 * @param {import('./private.js').FragmentFactory} type
		 * @param {0 | 1 | 2} index
		 * @param {number} [key]
		 * @param {any} [value]
		 * @returns {void}
		 */
		function update(type, index, key, value) {
			if (info.token !== token) return;
			info.resolved = value;
			let child_ctx = info.ctx;
			if (key !== undefined) {
				child_ctx = child_ctx.slice();
				child_ctx[key] = value;
			}
			const block = type && (info.current = type)(child_ctx);
			let needs_flush = false;
			if (info.block) {
				if (info.blocks) {
					info.blocks.forEach((block, i) => {
						if (i !== index && block) {
							group_outros();
							transition_out(block, 1, 1, () => {
								if (info.blocks[i] === block) {
									info.blocks[i] = null;
								}
							});
							check_outros();
						}
					});
				} else {
					info.block.d(1);
				}
				block.c();
				transition_in(block, 1);
				block.m(info.mount(), info.anchor);
				needs_flush = true;
			}
			info.block = block;
			if (info.blocks) info.blocks[index] = block;
			if (needs_flush) {
				flush();
			}
		}
		if (is_promise(promise)) {
			const current_component = get_current_component();
			promise.then(
				(value) => {
					set_current_component(current_component);
					update(info.then, 1, info.value, value);
					set_current_component(null);
				},
				(error) => {
					set_current_component(current_component);
					update(info.catch, 2, info.error, error);
					set_current_component(null);
					if (!info.hasCatch) {
						throw error;
					}
				}
			);
			// if we previously had a then/catch block, destroy it
			if (info.current !== info.pending) {
				update(info.pending, 0);
				return true;
			}
		} else {
			if (info.current !== info.then) {
				update(info.then, 1, info.value, promise);
				return true;
			}
			info.resolved = /** @type {T} */ (promise);
		}
	}

	/** @returns {void} */
	function update_await_block_branch(info, ctx, dirty) {
		const child_ctx = ctx.slice();
		const { resolved } = info;
		if (info.current === info.then) {
			child_ctx[info.value] = resolved;
		}
		if (info.current === info.catch) {
			child_ctx[info.error] = resolved;
		}
		info.block.p(child_ctx, dirty);
	}

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	// keyed each functions:

	/** @returns {void} */
	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	class ClientResponseError extends Error{constructor(e){super("ClientResponseError"),this.url="",this.status=0,this.response={},this.isAbort=!1,this.originalError=null,Object.setPrototypeOf(this,ClientResponseError.prototype),null!==e&&"object"==typeof e&&(this.url="string"==typeof e.url?e.url:"",this.status="number"==typeof e.status?e.status:0,this.isAbort=!!e.isAbort,this.originalError=e.originalError,null!==e.response&&"object"==typeof e.response?this.response=e.response:null!==e.data&&"object"==typeof e.data?this.response=e.data:this.response={}),this.originalError||e instanceof ClientResponseError||(this.originalError=e),"undefined"!=typeof DOMException&&e instanceof DOMException&&(this.isAbort=!0),this.name="ClientResponseError "+this.status,this.message=this.response?.message,this.message||(this.isAbort?this.message="The request was autocancelled. You can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation.":this.originalError?.cause?.message?.includes("ECONNREFUSED ::1")?this.message="Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).":this.message="Something went wrong while processing your request.");}get data(){return this.response}toJSON(){return {...this}}}const e=/^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;function cookieParse(e,t){const s={};if("string"!=typeof e)return s;const i=Object.assign({},{}).decode||defaultDecode;let n=0;for(;n<e.length;){const t=e.indexOf("=",n);if(-1===t)break;let r=e.indexOf(";",n);if(-1===r)r=e.length;else if(r<t){n=e.lastIndexOf(";",t-1)+1;continue}const o=e.slice(n,t).trim();if(void 0===s[o]){let n=e.slice(t+1,r).trim();34===n.charCodeAt(0)&&(n=n.slice(1,-1));try{s[o]=i(n);}catch(e){s[o]=n;}}n=r+1;}return s}function cookieSerialize(t,s,i){const n=Object.assign({},i||{}),r=n.encode||defaultEncode;if(!e.test(t))throw new TypeError("argument name is invalid");const o=r(s);if(o&&!e.test(o))throw new TypeError("argument val is invalid");let a=t+"="+o;if(null!=n.maxAge){const e=n.maxAge-0;if(isNaN(e)||!isFinite(e))throw new TypeError("option maxAge is invalid");a+="; Max-Age="+Math.floor(e);}if(n.domain){if(!e.test(n.domain))throw new TypeError("option domain is invalid");a+="; Domain="+n.domain;}if(n.path){if(!e.test(n.path))throw new TypeError("option path is invalid");a+="; Path="+n.path;}if(n.expires){if(!function isDate(e){return "[object Date]"===Object.prototype.toString.call(e)||e instanceof Date}(n.expires)||isNaN(n.expires.valueOf()))throw new TypeError("option expires is invalid");a+="; Expires="+n.expires.toUTCString();}if(n.httpOnly&&(a+="; HttpOnly"),n.secure&&(a+="; Secure"),n.priority){switch("string"==typeof n.priority?n.priority.toLowerCase():n.priority){case"low":a+="; Priority=Low";break;case"medium":a+="; Priority=Medium";break;case"high":a+="; Priority=High";break;default:throw new TypeError("option priority is invalid")}}if(n.sameSite){switch("string"==typeof n.sameSite?n.sameSite.toLowerCase():n.sameSite){case!0:a+="; SameSite=Strict";break;case"lax":a+="; SameSite=Lax";break;case"strict":a+="; SameSite=Strict";break;case"none":a+="; SameSite=None";break;default:throw new TypeError("option sameSite is invalid")}}return a}function defaultDecode(e){return -1!==e.indexOf("%")?decodeURIComponent(e):e}function defaultEncode(e){return encodeURIComponent(e)}const t="undefined"!=typeof navigator&&"ReactNative"===navigator.product||"undefined"!=typeof global&&global.HermesInternal;let s;function getTokenPayload(e){if(e)try{const t=decodeURIComponent(s(e.split(".")[1]).split("").map((function(e){return "%"+("00"+e.charCodeAt(0).toString(16)).slice(-2)})).join(""));return JSON.parse(t)||{}}catch(e){}return {}}function isTokenExpired(e,t=0){let s=getTokenPayload(e);return !(Object.keys(s).length>0&&(!s.exp||s.exp-t>Date.now()/1e3))}s="function"!=typeof atob||t?e=>{let t=String(e).replace(/=+$/,"");if(t.length%4==1)throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");for(var s,i,n=0,r=0,o="";i=t.charAt(r++);~i&&(s=n%4?64*s+i:i,n++%4)?o+=String.fromCharCode(255&s>>(-2*n&6)):0)i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(i);return o}:atob;const i="pb_auth";class BaseAuthStore{constructor(){this.baseToken="",this.baseModel=null,this._onChangeCallbacks=[];}get token(){return this.baseToken}get model(){return this.baseModel}get isValid(){return !isTokenExpired(this.token)}get isAdmin(){return "admin"===getTokenPayload(this.token).type}get isAuthRecord(){return "authRecord"===getTokenPayload(this.token).type}save(e,t){this.baseToken=e||"",this.baseModel=t||null,this.triggerChange();}clear(){this.baseToken="",this.baseModel=null,this.triggerChange();}loadFromCookie(e,t=i){const s=cookieParse(e||"")[t]||"";let n={};try{n=JSON.parse(s),(null===typeof n||"object"!=typeof n||Array.isArray(n))&&(n={});}catch(e){}this.save(n.token||"",n.model||null);}exportToCookie(e,t=i){const s={secure:!0,sameSite:!0,httpOnly:!0,path:"/"},n=getTokenPayload(this.token);s.expires=n?.exp?new Date(1e3*n.exp):new Date("1970-01-01"),e=Object.assign({},s,e);const r={token:this.token,model:this.model?JSON.parse(JSON.stringify(this.model)):null};let o=cookieSerialize(t,JSON.stringify(r),e);const a="undefined"!=typeof Blob?new Blob([o]).size:o.length;if(r.model&&a>4096){r.model={id:r?.model?.id,email:r?.model?.email};const s=["collectionId","username","verified"];for(const e in this.model)s.includes(e)&&(r.model[e]=this.model[e]);o=cookieSerialize(t,JSON.stringify(r),e);}return o}onChange(e,t=!1){return this._onChangeCallbacks.push(e),t&&e(this.token,this.model),()=>{for(let t=this._onChangeCallbacks.length-1;t>=0;t--)if(this._onChangeCallbacks[t]==e)return delete this._onChangeCallbacks[t],void this._onChangeCallbacks.splice(t,1)}}triggerChange(){for(const e of this._onChangeCallbacks)e&&e(this.token,this.model);}}class LocalAuthStore extends BaseAuthStore{constructor(e="pocketbase_auth"){super(),this.storageFallback={},this.storageKey=e,this._bindStorageEvent();}get token(){return (this._storageGet(this.storageKey)||{}).token||""}get model(){return (this._storageGet(this.storageKey)||{}).model||null}save(e,t){this._storageSet(this.storageKey,{token:e,model:t}),super.save(e,t);}clear(){this._storageRemove(this.storageKey),super.clear();}_storageGet(e){if("undefined"!=typeof window&&window?.localStorage){const t=window.localStorage.getItem(e)||"";try{return JSON.parse(t)}catch(e){return t}}return this.storageFallback[e]}_storageSet(e,t){if("undefined"!=typeof window&&window?.localStorage){let s=t;"string"!=typeof t&&(s=JSON.stringify(t)),window.localStorage.setItem(e,s);}else this.storageFallback[e]=t;}_storageRemove(e){"undefined"!=typeof window&&window?.localStorage&&window.localStorage?.removeItem(e),delete this.storageFallback[e];}_bindStorageEvent(){"undefined"!=typeof window&&window?.localStorage&&window.addEventListener&&window.addEventListener("storage",(e=>{if(e.key!=this.storageKey)return;const t=this._storageGet(this.storageKey)||{};super.save(t.token||"",t.model||null);}));}}class BaseService{constructor(e){this.client=e;}}class SettingsService extends BaseService{async getAll(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/settings",e)}async update(e,t){return t=Object.assign({method:"PATCH",body:e},t),this.client.send("/api/settings",t)}async testS3(e="storage",t){return t=Object.assign({method:"POST",body:{filesystem:e}},t),this.client.send("/api/settings/test/s3",t).then((()=>!0))}async testEmail(e,t,s){return s=Object.assign({method:"POST",body:{email:e,template:t}},s),this.client.send("/api/settings/test/email",s).then((()=>!0))}async generateAppleClientSecret(e,t,s,i,n,r){return r=Object.assign({method:"POST",body:{clientId:e,teamId:t,keyId:s,privateKey:i,duration:n}},r),this.client.send("/api/settings/apple/generate-client-secret",r)}}class CrudService extends BaseService{decode(e){return e}async getFullList(e,t){if("number"==typeof e)return this._getFullList(e,t);let s=500;return (t=Object.assign({},e,t)).batch&&(s=t.batch,delete t.batch),this._getFullList(s,t)}async getList(e=1,t=30,s){return (s=Object.assign({method:"GET"},s)).query=Object.assign({page:e,perPage:t},s.query),this.client.send(this.baseCrudPath,s).then((e=>(e.items=e.items?.map((e=>this.decode(e)))||[],e)))}async getFirstListItem(e,t){return (t=Object.assign({requestKey:"one_by_filter_"+this.baseCrudPath+"_"+e},t)).query=Object.assign({filter:e,skipTotal:1},t.query),this.getList(1,1,t).then((e=>{if(!e?.items?.length)throw new ClientResponseError({status:404,response:{code:404,message:"The requested resource wasn't found.",data:{}}});return e.items[0]}))}async getOne(e,t){if(!e)throw new ClientResponseError({url:this.client.buildUrl(this.baseCrudPath+"/"),status:404,response:{code:404,message:"Missing required record id.",data:{}}});return t=Object.assign({method:"GET"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),t).then((e=>this.decode(e)))}async create(e,t){return t=Object.assign({method:"POST",body:e},t),this.client.send(this.baseCrudPath,t).then((e=>this.decode(e)))}async update(e,t,s){return s=Object.assign({method:"PATCH",body:t},s),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),s).then((e=>this.decode(e)))}async delete(e,t){return t=Object.assign({method:"DELETE"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),t).then((()=>!0))}_getFullList(e=500,t){(t=t||{}).query=Object.assign({skipTotal:1},t.query);let s=[],request=async i=>this.getList(i,e||500,t).then((e=>{const t=e.items;return s=s.concat(t),t.length==e.perPage?request(i+1):s}));return request(1)}}function normalizeLegacyOptionsArgs(e,t,s,i){const n=void 0!==i;return n||void 0!==s?n?(console.warn(e),t.body=Object.assign({},t.body,s),t.query=Object.assign({},t.query,i),t):Object.assign(t,s):t}function resetAutoRefresh(e){e._resetAutoRefresh?.();}class AdminService extends CrudService{get baseCrudPath(){return "/api/admins"}async update(e,t,s){return super.update(e,t,s).then((e=>(this.client.authStore.model?.id===e.id&&void 0===this.client.authStore.model?.collectionId&&this.client.authStore.save(this.client.authStore.token,e),e)))}async delete(e,t){return super.delete(e,t).then((t=>(t&&this.client.authStore.model?.id===e&&void 0===this.client.authStore.model?.collectionId&&this.client.authStore.clear(),t)))}authResponse(e){const t=this.decode(e?.admin||{});return e?.token&&e?.admin&&this.client.authStore.save(e.token,t),Object.assign({},e,{token:e?.token||"",admin:t})}async authWithPassword(e,t,s,i){let n={method:"POST",body:{identity:e,password:t}};n=normalizeLegacyOptionsArgs("This form of authWithPassword(email, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(email, pass, options?).",n,s,i);const r=n.autoRefreshThreshold;delete n.autoRefreshThreshold,n.autoRefresh||resetAutoRefresh(this.client);let o=await this.client.send(this.baseCrudPath+"/auth-with-password",n);return o=this.authResponse(o),r&&function registerAutoRefresh(e,t,s,i){resetAutoRefresh(e);const n=e.beforeSend,r=e.authStore.model,o=e.authStore.onChange(((t,s)=>{(!t||s?.id!=r?.id||(s?.collectionId||r?.collectionId)&&s?.collectionId!=r?.collectionId)&&resetAutoRefresh(e);}));e._resetAutoRefresh=function(){o(),e.beforeSend=n,delete e._resetAutoRefresh;},e.beforeSend=async(r,o)=>{const a=e.authStore.token;if(o.query?.autoRefresh)return n?n(r,o):{url:r,sendOptions:o};let c=e.authStore.isValid;if(c&&isTokenExpired(e.authStore.token,t))try{await s();}catch(e){c=!1;}c||await i();const l=o.headers||{};for(let t in l)if("authorization"==t.toLowerCase()&&a==l[t]&&e.authStore.token){l[t]=e.authStore.token;break}return o.headers=l,n?n(r,o):{url:r,sendOptions:o}};}(this.client,r,(()=>this.authRefresh({autoRefresh:!0})),(()=>this.authWithPassword(e,t,Object.assign({autoRefresh:!0},n)))),o}async authRefresh(e,t){let s={method:"POST"};return s=normalizeLegacyOptionsArgs("This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",s,e,t),this.client.send(this.baseCrudPath+"/auth-refresh",s).then(this.authResponse.bind(this))}async requestPasswordReset(e,t,s){let i={method:"POST",body:{email:e}};return i=normalizeLegacyOptionsArgs("This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",i,t,s),this.client.send(this.baseCrudPath+"/request-password-reset",i).then((()=>!0))}async confirmPasswordReset(e,t,s,i,n){let r={method:"POST",body:{token:e,password:t,passwordConfirm:s}};return r=normalizeLegacyOptionsArgs("This form of confirmPasswordReset(resetToken, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(resetToken, password, passwordConfirm, options?).",r,i,n),this.client.send(this.baseCrudPath+"/confirm-password-reset",r).then((()=>!0))}}const n=["requestKey","$cancelKey","$autoCancel","fetch","headers","body","query","params","cache","credentials","headers","integrity","keepalive","method","mode","redirect","referrer","referrerPolicy","signal","window"];function normalizeUnknownQueryParams(e){if(e){e.query=e.query||{};for(let t in e)n.includes(t)||(e.query[t]=e[t],delete e[t]);}}class RealtimeService extends BaseService{constructor(){super(...arguments),this.clientId="",this.eventSource=null,this.subscriptions={},this.lastSentSubscriptions=[],this.maxConnectTimeout=15e3,this.reconnectAttempts=0,this.maxReconnectAttempts=1/0,this.predefinedReconnectIntervals=[200,300,500,1e3,1200,1500,2e3],this.pendingConnects=[];}get isConnected(){return !!this.eventSource&&!!this.clientId&&!this.pendingConnects.length}async subscribe(e,t,s){if(!e)throw new Error("topic must be set.");let i=e;if(s){normalizeUnknownQueryParams(s);const e="options="+encodeURIComponent(JSON.stringify({query:s.query,headers:s.headers}));i+=(i.includes("?")?"&":"?")+e;}const listener=function(e){const s=e;let i;try{i=JSON.parse(s?.data);}catch{}t(i||{});};return this.subscriptions[i]||(this.subscriptions[i]=[]),this.subscriptions[i].push(listener),this.isConnected?1===this.subscriptions[i].length?await this.submitSubscriptions():this.eventSource?.addEventListener(i,listener):await this.connect(),async()=>this.unsubscribeByTopicAndListener(e,listener)}async unsubscribe(e){let t=!1;if(e){const s=this.getSubscriptionsByTopic(e);for(let e in s)if(this.hasSubscriptionListeners(e)){for(let t of this.subscriptions[e])this.eventSource?.removeEventListener(e,t);delete this.subscriptions[e],t||(t=!0);}}else this.subscriptions={};this.hasSubscriptionListeners()?t&&await this.submitSubscriptions():this.disconnect();}async unsubscribeByPrefix(e){let t=!1;for(let s in this.subscriptions)if((s+"?").startsWith(e)){t=!0;for(let e of this.subscriptions[s])this.eventSource?.removeEventListener(s,e);delete this.subscriptions[s];}t&&(this.hasSubscriptionListeners()?await this.submitSubscriptions():this.disconnect());}async unsubscribeByTopicAndListener(e,t){let s=!1;const i=this.getSubscriptionsByTopic(e);for(let e in i){if(!Array.isArray(this.subscriptions[e])||!this.subscriptions[e].length)continue;let i=!1;for(let s=this.subscriptions[e].length-1;s>=0;s--)this.subscriptions[e][s]===t&&(i=!0,delete this.subscriptions[e][s],this.subscriptions[e].splice(s,1),this.eventSource?.removeEventListener(e,t));i&&(this.subscriptions[e].length||delete this.subscriptions[e],s||this.hasSubscriptionListeners(e)||(s=!0));}this.hasSubscriptionListeners()?s&&await this.submitSubscriptions():this.disconnect();}hasSubscriptionListeners(e){if(this.subscriptions=this.subscriptions||{},e)return !!this.subscriptions[e]?.length;for(let e in this.subscriptions)if(this.subscriptions[e]?.length)return !0;return !1}async submitSubscriptions(){if(this.clientId)return this.addAllSubscriptionListeners(),this.lastSentSubscriptions=this.getNonEmptySubscriptionKeys(),this.client.send("/api/realtime",{method:"POST",body:{clientId:this.clientId,subscriptions:this.lastSentSubscriptions},requestKey:this.getSubscriptionsCancelKey()}).catch((e=>{if(!e?.isAbort)throw e}))}getSubscriptionsCancelKey(){return "realtime_"+this.clientId}getSubscriptionsByTopic(e){const t={};e=e.includes("?")?e:e+"?";for(let s in this.subscriptions)(s+"?").startsWith(e)&&(t[s]=this.subscriptions[s]);return t}getNonEmptySubscriptionKeys(){const e=[];for(let t in this.subscriptions)this.subscriptions[t].length&&e.push(t);return e}addAllSubscriptionListeners(){if(this.eventSource){this.removeAllSubscriptionListeners();for(let e in this.subscriptions)for(let t of this.subscriptions[e])this.eventSource.addEventListener(e,t);}}removeAllSubscriptionListeners(){if(this.eventSource)for(let e in this.subscriptions)for(let t of this.subscriptions[e])this.eventSource.removeEventListener(e,t);}async connect(){if(!(this.reconnectAttempts>0))return new Promise(((e,t)=>{this.pendingConnects.push({resolve:e,reject:t}),this.pendingConnects.length>1||this.initConnect();}))}initConnect(){this.disconnect(!0),clearTimeout(this.connectTimeoutId),this.connectTimeoutId=setTimeout((()=>{this.connectErrorHandler(new Error("EventSource connect took too long."));}),this.maxConnectTimeout),this.eventSource=new EventSource(this.client.buildUrl("/api/realtime")),this.eventSource.onerror=e=>{this.connectErrorHandler(new Error("Failed to establish realtime connection."));},this.eventSource.addEventListener("PB_CONNECT",(e=>{const t=e;this.clientId=t?.lastEventId,this.submitSubscriptions().then((async()=>{let e=3;for(;this.hasUnsentSubscriptions()&&e>0;)e--,await this.submitSubscriptions();})).then((()=>{for(let e of this.pendingConnects)e.resolve();this.pendingConnects=[],this.reconnectAttempts=0,clearTimeout(this.reconnectTimeoutId),clearTimeout(this.connectTimeoutId);const t=this.getSubscriptionsByTopic("PB_CONNECT");for(let s in t)for(let i of t[s])i(e);})).catch((e=>{this.clientId="",this.connectErrorHandler(e);}));}));}hasUnsentSubscriptions(){const e=this.getNonEmptySubscriptionKeys();if(e.length!=this.lastSentSubscriptions.length)return !0;for(const t of e)if(!this.lastSentSubscriptions.includes(t))return !0;return !1}connectErrorHandler(e){if(clearTimeout(this.connectTimeoutId),clearTimeout(this.reconnectTimeoutId),!this.clientId&&!this.reconnectAttempts||this.reconnectAttempts>this.maxReconnectAttempts){for(let t of this.pendingConnects)t.reject(new ClientResponseError(e));return this.pendingConnects=[],void this.disconnect()}this.disconnect(!0);const t=this.predefinedReconnectIntervals[this.reconnectAttempts]||this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length-1];this.reconnectAttempts++,this.reconnectTimeoutId=setTimeout((()=>{this.initConnect();}),t);}disconnect(e=!1){if(clearTimeout(this.connectTimeoutId),clearTimeout(this.reconnectTimeoutId),this.removeAllSubscriptionListeners(),this.client.cancelRequest(this.getSubscriptionsCancelKey()),this.eventSource?.close(),this.eventSource=null,this.clientId="",!e){this.reconnectAttempts=0;for(let e of this.pendingConnects)e.resolve();this.pendingConnects=[];}}}class RecordService extends CrudService{constructor(e,t){super(e),this.collectionIdOrName=t;}get baseCrudPath(){return this.baseCollectionPath+"/records"}get baseCollectionPath(){return "/api/collections/"+encodeURIComponent(this.collectionIdOrName)}async subscribe(e,t,s){if(!e)throw new Error("Missing topic.");if(!t)throw new Error("Missing subscription callback.");return this.client.realtime.subscribe(this.collectionIdOrName+"/"+e,t,s)}async unsubscribe(e){return e?this.client.realtime.unsubscribe(this.collectionIdOrName+"/"+e):this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName)}async getFullList(e,t){if("number"==typeof e)return super.getFullList(e,t);const s=Object.assign({},e,t);return super.getFullList(s)}async getList(e=1,t=30,s){return super.getList(e,t,s)}async getFirstListItem(e,t){return super.getFirstListItem(e,t)}async getOne(e,t){return super.getOne(e,t)}async create(e,t){return super.create(e,t)}async update(e,t,s){return super.update(e,t,s).then((e=>(this.client.authStore.model?.id!==e?.id||this.client.authStore.model?.collectionId!==this.collectionIdOrName&&this.client.authStore.model?.collectionName!==this.collectionIdOrName||this.client.authStore.save(this.client.authStore.token,e),e)))}async delete(e,t){return super.delete(e,t).then((t=>(!t||this.client.authStore.model?.id!==e||this.client.authStore.model?.collectionId!==this.collectionIdOrName&&this.client.authStore.model?.collectionName!==this.collectionIdOrName||this.client.authStore.clear(),t)))}authResponse(e){const t=this.decode(e?.record||{});return this.client.authStore.save(e?.token,t),Object.assign({},e,{token:e?.token||"",record:t})}async listAuthMethods(e){return e=Object.assign({method:"GET"},e),this.client.send(this.baseCollectionPath+"/auth-methods",e).then((e=>Object.assign({},e,{usernamePassword:!!e?.usernamePassword,emailPassword:!!e?.emailPassword,authProviders:Array.isArray(e?.authProviders)?e?.authProviders:[]})))}async authWithPassword(e,t,s,i){let n={method:"POST",body:{identity:e,password:t}};return n=normalizeLegacyOptionsArgs("This form of authWithPassword(usernameOrEmail, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(usernameOrEmail, pass, options?).",n,s,i),this.client.send(this.baseCollectionPath+"/auth-with-password",n).then((e=>this.authResponse(e)))}async authWithOAuth2Code(e,t,s,i,n,r,o){let a={method:"POST",body:{provider:e,code:t,codeVerifier:s,redirectUrl:i,createData:n}};return a=normalizeLegacyOptionsArgs("This form of authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, options?).",a,r,o),this.client.send(this.baseCollectionPath+"/auth-with-oauth2",a).then((e=>this.authResponse(e)))}authWithOAuth2(...e){if(e.length>1||"string"==typeof e?.[0])return console.warn("PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration."),this.authWithOAuth2Code(e?.[0]||"",e?.[1]||"",e?.[2]||"",e?.[3]||"",e?.[4]||{},e?.[5]||{},e?.[6]||{});const t=e?.[0]||{};let s=null;t.urlCallback||(s=openBrowserPopup(void 0));const i=new RealtimeService(this.client);function cleanup(){s?.close(),i.unsubscribe();}const n={},r=t.requestKey;return r&&(n.requestKey=r),this.listAuthMethods(n).then((e=>{const n=e.authProviders.find((e=>e.name===t.provider));if(!n)throw new ClientResponseError(new Error(`Missing or invalid provider "${t.provider}".`));const o=this.client.buildUrl("/api/oauth2-redirect"),a=r?this.client.cancelControllers?.[r]:void 0;return a&&(a.signal.onabort=()=>{cleanup();}),new Promise((async(e,r)=>{try{await i.subscribe("@oauth2",(async s=>{const c=i.clientId;try{if(!s.state||c!==s.state)throw new Error("State parameters don't match.");if(s.error||!s.code)throw new Error("OAuth2 redirect error or missing code: "+s.error);const i=Object.assign({},t);delete i.provider,delete i.scopes,delete i.createData,delete i.urlCallback,a?.signal?.onabort&&(a.signal.onabort=null);const r=await this.authWithOAuth2Code(n.name,s.code,n.codeVerifier,o,t.createData,i);e(r);}catch(e){r(new ClientResponseError(e));}cleanup();}));const c={state:i.clientId};t.scopes?.length&&(c.scope=t.scopes.join(" "));const l=this._replaceQueryParams(n.authUrl+o,c);let h=t.urlCallback||function(e){s?s.location.href=e:s=openBrowserPopup(e);};await h(l);}catch(e){cleanup(),r(new ClientResponseError(e));}}))})).catch((e=>{throw cleanup(),e}))}async authRefresh(e,t){let s={method:"POST"};return s=normalizeLegacyOptionsArgs("This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",s,e,t),this.client.send(this.baseCollectionPath+"/auth-refresh",s).then((e=>this.authResponse(e)))}async requestPasswordReset(e,t,s){let i={method:"POST",body:{email:e}};return i=normalizeLegacyOptionsArgs("This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",i,t,s),this.client.send(this.baseCollectionPath+"/request-password-reset",i).then((()=>!0))}async confirmPasswordReset(e,t,s,i,n){let r={method:"POST",body:{token:e,password:t,passwordConfirm:s}};return r=normalizeLegacyOptionsArgs("This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).",r,i,n),this.client.send(this.baseCollectionPath+"/confirm-password-reset",r).then((()=>!0))}async requestVerification(e,t,s){let i={method:"POST",body:{email:e}};return i=normalizeLegacyOptionsArgs("This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).",i,t,s),this.client.send(this.baseCollectionPath+"/request-verification",i).then((()=>!0))}async confirmVerification(e,t,s){let i={method:"POST",body:{token:e}};return i=normalizeLegacyOptionsArgs("This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).",i,t,s),this.client.send(this.baseCollectionPath+"/confirm-verification",i).then((()=>{const t=getTokenPayload(e),s=this.client.authStore.model;return s&&!s.verified&&s.id===t.id&&s.collectionId===t.collectionId&&(s.verified=!0,this.client.authStore.save(this.client.authStore.token,s)),!0}))}async requestEmailChange(e,t,s){let i={method:"POST",body:{newEmail:e}};return i=normalizeLegacyOptionsArgs("This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).",i,t,s),this.client.send(this.baseCollectionPath+"/request-email-change",i).then((()=>!0))}async confirmEmailChange(e,t,s,i){let n={method:"POST",body:{token:e,password:t}};return n=normalizeLegacyOptionsArgs("This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).",n,s,i),this.client.send(this.baseCollectionPath+"/confirm-email-change",n).then((()=>{const t=getTokenPayload(e),s=this.client.authStore.model;return s&&s.id===t.id&&s.collectionId===t.collectionId&&this.client.authStore.clear(),!0}))}async listExternalAuths(e,t){return t=Object.assign({method:"GET"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e)+"/external-auths",t)}async unlinkExternalAuth(e,t,s){return s=Object.assign({method:"DELETE"},s),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e)+"/external-auths/"+encodeURIComponent(t),s).then((()=>!0))}_replaceQueryParams(e,t={}){let s=e,i="";e.indexOf("?")>=0&&(s=e.substring(0,e.indexOf("?")),i=e.substring(e.indexOf("?")+1));const n={},r=i.split("&");for(const e of r){if(""==e)continue;const t=e.split("=");n[decodeURIComponent(t[0].replace(/\+/g," "))]=decodeURIComponent((t[1]||"").replace(/\+/g," "));}for(let e in t)t.hasOwnProperty(e)&&(null==t[e]?delete n[e]:n[e]=t[e]);i="";for(let e in n)n.hasOwnProperty(e)&&(""!=i&&(i+="&"),i+=encodeURIComponent(e.replace(/%20/g,"+"))+"="+encodeURIComponent(n[e].replace(/%20/g,"+")));return ""!=i?s+"?"+i:s}}function openBrowserPopup(e){if("undefined"==typeof window||!window?.open)throw new ClientResponseError(new Error("Not in a browser context - please pass a custom urlCallback function."));let t=1024,s=768,i=window.innerWidth,n=window.innerHeight;t=t>i?i:t,s=s>n?n:s;let r=i/2-t/2,o=n/2-s/2;return window.open(e,"popup_window","width="+t+",height="+s+",top="+o+",left="+r+",resizable,menubar=no")}class CollectionService extends CrudService{get baseCrudPath(){return "/api/collections"}async import(e,t=!1,s){return s=Object.assign({method:"PUT",body:{collections:e,deleteMissing:t}},s),this.client.send(this.baseCrudPath+"/import",s).then((()=>!0))}}class LogService extends BaseService{async getList(e=1,t=30,s){return (s=Object.assign({method:"GET"},s)).query=Object.assign({page:e,perPage:t},s.query),this.client.send("/api/logs",s)}async getOne(e,t){if(!e)throw new ClientResponseError({url:this.client.buildUrl("/api/logs/"),status:404,response:{code:404,message:"Missing required log id.",data:{}}});return t=Object.assign({method:"GET"},t),this.client.send("/api/logs/"+encodeURIComponent(e),t)}async getStats(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/logs/stats",e)}}class HealthService extends BaseService{async check(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/health",e)}}class FileService extends BaseService{getUrl(e,t,s={}){if(!t||!e?.id||!e?.collectionId&&!e?.collectionName)return "";const i=[];i.push("api"),i.push("files"),i.push(encodeURIComponent(e.collectionId||e.collectionName)),i.push(encodeURIComponent(e.id)),i.push(encodeURIComponent(t));let n=this.client.buildUrl(i.join("/"));if(Object.keys(s).length){!1===s.download&&delete s.download;const e=new URLSearchParams(s);n+=(n.includes("?")?"&":"?")+e;}return n}async getToken(e){return e=Object.assign({method:"POST"},e),this.client.send("/api/files/token",e).then((e=>e?.token||""))}}class BackupService extends BaseService{async getFullList(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/backups",e)}async create(e,t){return t=Object.assign({method:"POST",body:{name:e}},t),this.client.send("/api/backups",t).then((()=>!0))}async upload(e,t){return t=Object.assign({method:"POST",body:e},t),this.client.send("/api/backups/upload",t).then((()=>!0))}async delete(e,t){return t=Object.assign({method:"DELETE"},t),this.client.send(`/api/backups/${encodeURIComponent(e)}`,t).then((()=>!0))}async restore(e,t){return t=Object.assign({method:"POST"},t),this.client.send(`/api/backups/${encodeURIComponent(e)}/restore`,t).then((()=>!0))}getDownloadUrl(e,t){return this.client.buildUrl(`/api/backups/${encodeURIComponent(t)}?token=${encodeURIComponent(e)}`)}}class Client{constructor(e="/",t,s="en-US"){this.cancelControllers={},this.recordServices={},this.enableAutoCancellation=!0,this.baseUrl=e,this.lang=s,this.authStore=t||new LocalAuthStore,this.admins=new AdminService(this),this.collections=new CollectionService(this),this.files=new FileService(this),this.logs=new LogService(this),this.settings=new SettingsService(this),this.realtime=new RealtimeService(this),this.health=new HealthService(this),this.backups=new BackupService(this);}collection(e){return this.recordServices[e]||(this.recordServices[e]=new RecordService(this,e)),this.recordServices[e]}autoCancellation(e){return this.enableAutoCancellation=!!e,this}cancelRequest(e){return this.cancelControllers[e]&&(this.cancelControllers[e].abort(),delete this.cancelControllers[e]),this}cancelAllRequests(){for(let e in this.cancelControllers)this.cancelControllers[e].abort();return this.cancelControllers={},this}filter(e,t){if(!t)return e;for(let s in t){let i=t[s];switch(typeof i){case"boolean":case"number":i=""+i;break;case"string":i="'"+i.replace(/'/g,"\\'")+"'";break;default:i=null===i?"null":i instanceof Date?"'"+i.toISOString().replace("T"," ")+"'":"'"+JSON.stringify(i).replace(/'/g,"\\'")+"'";}e=e.replaceAll("{:"+s+"}",i);}return e}getFileUrl(e,t,s={}){return this.files.getUrl(e,t,s)}buildUrl(e){let t=this.baseUrl;return "undefined"==typeof window||!window.location||t.startsWith("https://")||t.startsWith("http://")||(t=window.location.origin?.endsWith("/")?window.location.origin.substring(0,window.location.origin.length-1):window.location.origin||"",this.baseUrl.startsWith("/")||(t+=window.location.pathname||"/",t+=t.endsWith("/")?"":"/"),t+=this.baseUrl),e&&(t+=t.endsWith("/")?"":"/",t+=e.startsWith("/")?e.substring(1):e),t}async send(e,t){t=this.initSendOptions(e,t);let s=this.buildUrl(e);if(this.beforeSend){const e=Object.assign({},await this.beforeSend(s,t));void 0!==e.url||void 0!==e.options?(s=e.url||s,t=e.options||t):Object.keys(e).length&&(t=e,console?.warn&&console.warn("Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`."));}if(void 0!==t.query){const e=this.serializeQueryParams(t.query);e&&(s+=(s.includes("?")?"&":"?")+e),delete t.query;}"application/json"==this.getHeader(t.headers,"Content-Type")&&t.body&&"string"!=typeof t.body&&(t.body=JSON.stringify(t.body));return (t.fetch||fetch)(s,t).then((async e=>{let t={};try{t=await e.json();}catch(e){}if(this.afterSend&&(t=await this.afterSend(e,t)),e.status>=400)throw new ClientResponseError({url:e.url,status:e.status,data:t});return t})).catch((e=>{throw new ClientResponseError(e)}))}initSendOptions(e,t){if((t=Object.assign({method:"GET"},t)).body=this.convertToFormDataIfNeeded(t.body),normalizeUnknownQueryParams(t),t.query=Object.assign({},t.params,t.query),void 0===t.requestKey&&(!1===t.$autoCancel||!1===t.query.$autoCancel?t.requestKey=null:(t.$cancelKey||t.query.$cancelKey)&&(t.requestKey=t.$cancelKey||t.query.$cancelKey)),delete t.$autoCancel,delete t.query.$autoCancel,delete t.$cancelKey,delete t.query.$cancelKey,null!==this.getHeader(t.headers,"Content-Type")||this.isFormData(t.body)||(t.headers=Object.assign({},t.headers,{"Content-Type":"application/json"})),null===this.getHeader(t.headers,"Accept-Language")&&(t.headers=Object.assign({},t.headers,{"Accept-Language":this.lang})),this.authStore.token&&null===this.getHeader(t.headers,"Authorization")&&(t.headers=Object.assign({},t.headers,{Authorization:this.authStore.token})),this.enableAutoCancellation&&null!==t.requestKey){const s=t.requestKey||(t.method||"GET")+e;delete t.requestKey,this.cancelRequest(s);const i=new AbortController;this.cancelControllers[s]=i,t.signal=i.signal;}return t}convertToFormDataIfNeeded(e){if("undefined"==typeof FormData||void 0===e||"object"!=typeof e||null===e||this.isFormData(e)||!this.hasBlobField(e))return e;const t=new FormData;for(const s in e){const i=e[s];if("object"!=typeof i||this.hasBlobField({data:i})){const e=Array.isArray(i)?i:[i];for(let i of e)t.append(s,i);}else {let e={};e[s]=i,t.append("@jsonPayload",JSON.stringify(e));}}return t}hasBlobField(e){for(const t in e){const s=Array.isArray(e[t])?e[t]:[e[t]];for(const e of s)if("undefined"!=typeof Blob&&e instanceof Blob||"undefined"!=typeof File&&e instanceof File)return !0}return !1}getHeader(e,t){e=e||{},t=t.toLowerCase();for(let s in e)if(s.toLowerCase()==t)return e[s];return null}isFormData(e){return e&&("FormData"===e.constructor.name||"undefined"!=typeof FormData&&e instanceof FormData)}serializeQueryParams(e){const t=[];for(const s in e){if(null===e[s])continue;const i=e[s],n=encodeURIComponent(s);if(Array.isArray(i))for(const e of i)t.push(n+"="+encodeURIComponent(e));else i instanceof Date?t.push(n+"="+encodeURIComponent(i.toISOString())):null!==typeof i&&"object"==typeof i?t.push(n+"="+encodeURIComponent(JSON.stringify(i))):t.push(n+"="+encodeURIComponent(i));}return t.join("&")}}

	/* src/routes/iframe/Embed.svelte generated by Svelte v4.2.18 */

	function add_css(target) {
		append_styles(target, "svelte-o3gnxl", ".product-grid.svelte-o3gnxl.svelte-o3gnxl{display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:20px}.product-card.svelte-o3gnxl.svelte-o3gnxl{border:1px solid #ddd;border-radius:8px;padding:16px;background-color:#f9f9f9}.product-card.svelte-o3gnxl h2.svelte-o3gnxl{margin-top:0;color:#333}.stock.svelte-o3gnxl.svelte-o3gnxl{margin-top:auto}.price.svelte-o3gnxl.svelte-o3gnxl{font-weight:bold;color:#007bff}");
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	// (34:0) {:catch error}
	function create_catch_block(ctx) {
		let p;

		return {
			c() {
				p = element("p");
				p.textContent = "Oops something wrong happened";
				set_style(p, "color", "red");
			},
			m(target, anchor) {
				insert(target, p, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(p);
				}
			}
		};
	}

	// (18:0) {:then products}
	function create_then_block(ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_value = ensure_array_like(/*products*/ ctx[3].items);
		const get_key = ctx => /*product*/ ctx[4].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "product-grid svelte-o3gnxl");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p(ctx, dirty) {
				if (dirty & /*promise*/ 1) {
					each_value = ensure_array_like(/*products*/ ctx[3].items);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block, null, get_each_context);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	// (20:4) {#each products.items as product (product.id)}
	function create_each_block(key_1, ctx) {
		let div;
		let img;
		let img_src_value;
		let t0;
		let h2;
		let t2;
		let p0;
		let t4;
		let p1;
		let t7;
		let p2;
		let t10;

		return {
			key: key_1,
			first: null,
			c() {
				div = element("div");
				img = element("img");
				t0 = space();
				h2 = element("h2");
				h2.textContent = `${/*product*/ ctx[4].name}`;
				t2 = space();
				p0 = element("p");
				p0.textContent = `${/*product*/ ctx[4].description}`;
				t4 = space();
				p1 = element("p");
				p1.textContent = `\$${/*product*/ ctx[4].price}`;
				t7 = space();
				p2 = element("p");
				p2.textContent = `${/*product*/ ctx[4].stock} in stock`;
				t10 = space();
				set_style(img, "width", "100%");
				set_style(img, "max-width", "300px");
				set_style(img, "margin-bottom", "20px");
				set_style(img, "display", "flex-wrap: wrap");
				if (!src_url_equal(img.src, img_src_value = "http://127.0.0.1:8090/api/files/products/" + /*product*/ ctx[4].id + "/" + /*product*/ ctx[4].image)) attr(img, "src", img_src_value);
				attr(img, "alt", /*product*/ ctx[4].name);
				attr(h2, "class", "svelte-o3gnxl");
				attr(p1, "class", "price svelte-o3gnxl");
				attr(p2, "class", "stock svelte-o3gnxl");
				attr(div, "class", "product-card svelte-o3gnxl");
				this.first = div;
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, img);
				append(div, t0);
				append(div, h2);
				append(div, t2);
				append(div, p0);
				append(div, t4);
				append(div, p1);
				append(div, t7);
				append(div, p2);
				append(div, t10);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (16:16)    <p>Loading...</p> {:then products}
	function create_pending_block(ctx) {
		let p;

		return {
			c() {
				p = element("p");
				p.textContent = "Loading...";
			},
			m(target, anchor) {
				insert(target, p, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(p);
				}
			}
		};
	}

	function create_fragment(ctx) {
		let await_block_anchor;

		let info = {
			ctx,
			current: null,
			token: null,
			hasCatch: true,
			pending: create_pending_block,
			then: create_then_block,
			catch: create_catch_block,
			value: 3,
			error: 7
		};

		handle_promise(/*promise*/ ctx[0], info);

		return {
			c() {
				await_block_anchor = empty();
				info.block.c();
			},
			m(target, anchor) {
				insert(target, await_block_anchor, anchor);
				info.block.m(target, info.anchor = anchor);
				info.mount = () => await_block_anchor.parentNode;
				info.anchor = await_block_anchor;
			},
			p(new_ctx, [dirty]) {
				ctx = new_ctx;
				update_await_block_branch(info, ctx, dirty);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(await_block_anchor);
				}

				info.block.d(detaching);
				info.token = null;
				info = null;
			}
		};
	}

	function instance($$self) {
		const pb = new Client("http://127.0.0.1:8090");

		async function retrieveData() {
			let result = await pb.collection("products").getList();
			console.log(result.items);
			return result;
		}

		let promise = retrieveData();
		return [promise];
	}

	class Embed extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
		}
	}

	var div = document.createElement("DIV");
	var script = document.currentScript;
	script.parentNode.insertBefore(div, script);

	new Embed({
	  target: div,
	  props: { name: "Svelte component" },
	});

})();
