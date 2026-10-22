import { I as kt } from "./index-laaXFKjm.js";
const M = {
  properties: {
    version: {
      type: "number",
      const: 2,
      description: `Not a generic 'number' type – this schema is specifically for Blueprints v2. Version 1 had no "version" field and versions 3, 4, 5, etc will be different from version 2.`
    },
    $schema: {
      anyOf: [
        { $ref: "#/definitions/DataSources.URLReference" },
        { $ref: "#/definitions/DataSources.ExecutionContextPath" }
      ],
      description: "JSON Schema URL."
    },
    blueprintMeta: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        moreInfo: { type: "string" },
        version: { type: "string" },
        authors: { type: "array", items: { type: "string" } },
        homepage: { $ref: "#/definitions/DataSources.URLReference" },
        donateLink: { $ref: "#/definitions/DataSources.URLReference" },
        tags: { type: "array", items: { type: "string" } },
        license: { type: "string" }
      },
      additionalProperties: !1
    },
    applicationOptions: {
      type: "object",
      properties: {
        "wordpress-playground": {
          type: "object",
          properties: {
            landingPage: {
              type: "string",
              description: "The first page the user is redirected to once the Playground is loaded and the Blueprint is executed.",
              default: "/wp-admin"
            },
            login: {
              anyOf: [
                { type: "boolean" },
                {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    password: { type: "string" }
                  },
                  required: ["username", "password"],
                  additionalProperties: !1
                }
              ],
              description: 'Whether to log the user in after the Blueprint is executed. If true, the user is logged in as "admin".',
              default: !1
            },
            networkAccess: {
              type: "boolean",
              description: "Whether to allow the site to access the network.",
              default: !1
            },
            loadPhpExtensions: {
              type: "array",
              items: { type: "string", const: "intl" },
              description: "Optional PHP extensions to load in the Playground runtime before executing the Blueprint. Extensions omitted from this list are not disabled."
            }
          },
          additionalProperties: !1,
          description: "Options for the WordPress Playground."
        }
      },
      required: ["wordpress-playground"],
      additionalProperties: !1,
      description: "Divergence from Blueprints v1:\n\nThere are no `landingPage` or `login` top-level properties. Instead, Blueprint v2 introduces a dedicated top-level `applicationOptions` property for declaring options or opinions for different application contexts.\n\nTo keep Blueprints portable and focused on site creation, this specification only allows a small set of Playground-specific options. Other environments cannot declare additional options. Future versions of this specification may allow additional options – they will be discussed on a case-by-case basis."
    },
    contentBaseline: {
      anyOf: [
        { type: "string", const: "keep-all" },
        { type: "string", const: "empty" },
        {
          type: "string",
          enum: ["posts", "pages"],
          description: "Content types created by a vanilla WordPress installation and controlled by `contentBaseline`."
        },
        {
          type: "array",
          items: {
            type: "string",
            enum: ["posts", "pages", "comments"],
            description: "Content types created by a vanilla WordPress installation and controlled by `contentBaseline`."
          },
          minItems: 1,
          uniqueItems: !0,
          allOf: [
            {
              if: { contains: { const: "comments" } },
              then: {
                allOf: [
                  { contains: { const: "posts" } },
                  { contains: { const: "pages" } }
                ]
              }
            }
          ]
        }
      ],
      description: 'The content from a vanilla WordPress installation to retain before applying the rest of the Blueprint. `keep-all` leaves the installation unchanged, `empty` removes its posts, pages, and comments, a content type retains only that type, and a list retains the selected content types.\n\nThis policy runs only when the current invocation creates vanilla WordPress. It is skipped when applying the Blueprint to an existing site, so it cannot erase content from that site. It is not valid when `wordpressVersion` is "none". Metadata and relationships follow their parent content. Empty content tables have their sequences reset so subsequent imports receive the identifiers they would on a site created without default content.\n\nComments can only be retained together with both posts and pages because the schema cannot know which type contains their parent records.',
      default: "keep-all"
    },
    usersBaseline: {
      type: "string",
      enum: ["keep-all", "empty"],
      description: 'The users from a vanilla WordPress installation to retain before applying the rest of the Blueprint. `keep-all` retains the administrator created by WordPress, while `empty` removes it before creating the users declared by this Blueprint.\n\nEmpty user tables have their sequences reset before those users are created.\n\nAn empty user baseline requires an empty content baseline so removing the installation administrator cannot silently delete or orphan authored content. It also requires at least one declared administrator, ensuring the resulting WordPress site remains manageable.\n\nLike `contentBaseline`, this policy is skipped when applying the Blueprint to an existing site and is not valid when `wordpressVersion` is "none".',
      default: "keep-all"
    },
    siteLanguage: {
      type: "string",
      description: "Sets the WPLANG constant and downloads any missing translations for WordPress core and all the installed plugins and themes. If you need a fine-grained control over the translations, use imperative steps in the `additionalStepsAfterExecution` array.",
      default: "en_US"
    },
    siteOptions: {
      type: "object",
      additionalProperties: {
        type: ["string", "boolean", "number", "array", "object"]
      },
      properties: {
        blogname: {
          type: "string",
          description: `Site title.

Example: "Adam's Movies"`,
          default: "My WordPress Site"
        },
        timezone_string: {
          type: "string",
          description: 'Example: "Poland/Warsaw"',
          default: "UTC"
        },
        permalink_structure: {
          anyOf: [
            { type: "string" },
            { type: "boolean", const: !1 }
          ],
          description: 'Site permalink structure. If present and different from the current permalink structure, the Blueprint runner will run `$wp_rewrite->flush_rules();`. If you only want to set this option without flushing the rules, use an explicit `additionalStepsAfterExecution` step.\n\nExample: "/%year%/%monthnum%/%postname%/" or false for no pretty permalinks.',
          default: "/%postname%/"
        },
        siteUrl: !1
      },
      description: `Site options. In WordPress, the values are PHP-serializable, but Blueprints are intentionally restricted to an even stricter subset of those, that are JSON-serializable. This is to prevent passing JavaScript Date objects and similar.

The runner **MUST** use the WordPress \`update_option\` function to store the siteOptions values defined in this property as WordPress options. Lists and objects are passed to \`update_option\` as PHP arrays.

Site options example:

\`\`\`json {     "blogname": "Adam's Movies",     "timezone": "Poland/Warsaw",     "gutenberg-experiments": { 			'gutenberg-custom-dataviews': true, 			'gutenberg-new-posts-dashboard': true, 			'gutenberg-quick-edit-dataviews': true 		} } \`\`\``
    },
    constants: {
      type: "object",
      additionalProperties: { type: ["boolean", "string", "number"] },
      properties: {
        WP_DEBUG: { type: "boolean" },
        WP_DEBUG_LOG: { type: "boolean" },
        WP_DEBUG_DISPLAY: { type: "boolean" },
        SCRIPT_DEBUG: { type: "boolean" }
      },
      description: `Constants to define in the wp-config.php file.

The runner may overwrite the define() calls in the wp-config.php file on the target site. It assumes the wp-config.php file at the Blueprint Execution Target is writable.`
    },
    wordpressVersion: {
      anyOf: [
        { $ref: "#/definitions/DataSources.WordPressVersion" },
        { $ref: "#/definitions/DataSources.DataReference" },
        {
          type: "object",
          properties: {
            min: {
              $ref: "#/definitions/DataSources.WordPressVersionConstraintVersion"
            },
            max: {
              $ref: "#/definitions/DataSources.WordPressVersionConstraintVersion"
            },
            preferred: {
              $ref: "#/definitions/DataSources.WordPressVersionPreferredVersion",
              default: "latest"
            }
          },
          required: ["min"],
          additionalProperties: !1
        }
      ],
      description: `WordPress version to install or require.

A string selects the version for a newly created site. A branch such as \`6.8\` selects the newest available release in that branch. Strings are selection hints and do not reject an existing site. \`"none"\` boots the PHP runtime without downloading WordPress or initializing its database.

An object declares compatibility bounds. The runner chooses the newest available release within those bounds for a new site and verifies an existing site's installed version against them. \`preferred\` influences new-site selection without narrowing compatibility.

A data reference supplies the WordPress files for a newly created site.`,
      default: "latest"
    },
    phpVersion: {
      anyOf: [
        { $ref: "#/definitions/DataSources.PHPVersion" },
        {
          type: "object",
          properties: {
            min: {
              $ref: "#/definitions/DataSources.PHPVersionConstraintVersion"
            },
            recommended: {
              $ref: "#/definitions/DataSources.PHPVersionConstraintVersion"
            },
            max: {
              $ref: "#/definitions/DataSources.PHPVersionConstraintVersion"
            }
          },
          additionalProperties: !1
        }
      ],
      description: `The PHP version required for this Blueprint to work.

In runtimes where we set up the runtime, such as Playground and wp-env, the runner will choose a version compatible with this constraint.

In other environments, this is used for validation. The Blueprint engine will throw an error if the currently running PHP version doesn't match this constraint.`,
      default: '"8.0". Changing the default value will bump the Blueprint version.'
    },
    activeTheme: {
      anyOf: [
        { $ref: "#/definitions/DataSources.ThemeDirectoryReference" },
        { $ref: "#/definitions/DataSources.DataReference" },
        {
          type: "object",
          properties: {
            source: {
              anyOf: [
                {
                  $ref: "#/definitions/DataSources.ThemeDirectoryReference"
                },
                {
                  $ref: "#/definitions/DataSources.DataReference"
                }
              ]
            },
            importStarterContent: {
              type: "boolean",
              description: "Whether to import the theme's starter content after installing it."
            },
            targetDirectoryName: {
              type: "string",
              description: "An explicit directory name within wp-content/themes to install the theme at. If not provided, it will be inferred from the theme source.",
              pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
            },
            onError: {
              type: "string",
              enum: ["skip-theme", "throw"],
              description: "Sometimes it's fine when a theme fails to install.",
              default: "throw"
            },
            ifAlreadyInstalled: {
              type: "string",
              enum: ["overwrite", "skip", "error"],
              description: "How to handle a theme that is already installed.",
              default: "overwrite"
            },
            humanReadableName: {
              type: "string",
              description: 'Human-readable name of the theme for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "themes": [         {             "source": "https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip",             "humanReadableName": "Adventurer"         }     ] } ```\n\nThe progress bar will show "Installing Adventurer theme" instead of "Installing https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip".'
            }
          },
          required: ["source"],
          additionalProperties: !1
        }
      ],
      description: 'The theme to install and also activate.\n\n> Why not support an `active` property in the `themes` array?\n\nBecause an `"active"` property would have to default to `false` for themes while it defaults to `true` for plugins. That\'s error-prone and confusing.'
    },
    themes: {
      type: "array",
      items: {
        anyOf: [
          {
            $ref: "#/definitions/DataSources.ThemeDirectoryReference"
          },
          { $ref: "#/definitions/DataSources.DataReference" },
          {
            type: "object",
            properties: {
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.ThemeDirectoryReference"
                  },
                  {
                    $ref: "#/definitions/DataSources.DataReference"
                  }
                ]
              },
              importStarterContent: {
                type: "boolean",
                description: "Whether to import the theme's starter content after installing it."
              },
              targetDirectoryName: {
                type: "string",
                description: "An explicit directory name within wp-content/themes to install the theme at. If not provided, it will be inferred from the theme source.",
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              onError: {
                type: "string",
                enum: ["skip-theme", "throw"],
                description: "Sometimes it's fine when a theme fails to install.",
                default: "throw"
              },
              ifAlreadyInstalled: {
                type: "string",
                enum: ["overwrite", "skip", "error"],
                description: "How to handle a theme that is already installed.",
                default: "overwrite"
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the theme for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "themes": [         {             "source": "https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip",             "humanReadableName": "Adventurer"         }     ] } ```\n\nThe progress bar will show "Installing Adventurer theme" instead of "Installing https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip".'
              }
            },
            required: ["source"],
            additionalProperties: !1
          }
        ]
      },
      description: 'Installed themes to install without activating them.\n\nExample:\n\n```json {     "version": 2,     "themes": [         "stylish-press-theme",         "adventurer@4.6.0",         {             "source": "https://github.com/richtabor/kanso/archive/refs/heads/main.zip",             "targetDirectoryName": "kanso"         }     ] } ```'
    },
    plugins: {
      type: "array",
      items: {
        anyOf: [
          { $ref: "#/definitions/DataSources.DataReference" },
          {
            $ref: "#/definitions/DataSources.PluginDirectoryReference"
          },
          {
            type: "object",
            properties: {
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.DataReference"
                  },
                  {
                    $ref: "#/definitions/DataSources.PluginDirectoryReference"
                  }
                ]
              },
              active: {
                type: "boolean",
                description: "Whether to activate the plugin.",
                default: "true."
              },
              activationOptions: {
                type: "object",
                additionalProperties: {
                  anyOf: [
                    { type: "string" },
                    { type: "boolean" },
                    { type: "number" },
                    {
                      type: "array",
                      items: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    },
                    {
                      type: "object",
                      additionalProperties: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    }
                  ]
                },
                description: `Parameters to pass to the plugin during activation.

These options are stored in a site option that the plugin can access during its activation hook. The option name is:

\`\`\`php 'blueprint_activation_' . plugin_basename( __FILE__ ) \`\`\`

This ensures uniqueness even when multiple versions of the same plugin exist. This is similar to how the \`register_activation_hook\` function requires the plugin file path as its first argument.

The Blueprint runner will remove the option after activating the plugin.

Example:

In the Blueprint: \`\`\`json {     "source": "woocommerce",     "activationOptions": {         "storeCity": "Wrocław",         "storeCountry": "Poland",         "storePostalCode": "53-607"     } } \`\`\`

In the plugin's activation hook:

\`\`\`php register_activation_hook( __FILE__, function( $network_wide ) {     // Get the activation options from the transient     $option_name = 'blueprint_activation_' . plugin_basename( __FILE__ );     $blueprint_activation_options = get_option( $option_name ) ?? [];

    if ( $blueprint_activation_options ) {         $store_city = $blueprint_activation_options['storeCity'] ?? '';         $store_country = $blueprint_activation_options['storeCountry'] ?? '';         $store_postal_code = $blueprint_activation_options['storePostalCode'] ?? '';

        // ...do something with the options...     }

    // Continue with normal activation... } ); \`\`\``
              },
              targetDirectoryName: {
                type: "string",
                description: "An explicit directory name within wp-content/plugins to install the plugin at. If not provided, it will be inferred from the plugin source.",
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              onError: {
                type: "string",
                enum: ["skip-plugin", "throw"],
                description: `Sometimes it's fine when a plugin fails to install.

Use-case:   Compatibility testing. A Blueprint may install WordPress nightly with   a number of plugins to test. Some of those plugins may not yet be compatible   with the latest version of WordPress. This is something to take not of,   but not a strong reason to fail the entire Blueprint installation.`,
                default: "throw"
              },
              ifAlreadyInstalled: {
                type: "string",
                enum: ["overwrite", "skip", "error"],
                description: "How to handle a plugin that is already installed.",
                default: "overwrite"
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the plugin for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "plugins": [         {             "source": "https://github.com/Automattic/jetpack/archive/refs/heads/beta.zip",             "humanReadableName": "Jetpack Beta"         }     ] } ```\n\nThe progress bar will show "Installing Jetpack Beta plugin" instead of "Installing https://github.com/Automattic/jetpack/archive/refs/heads/beta.zip".'
              }
            },
            required: ["source"],
            additionalProperties: !1
          }
        ]
      },
      description: 'A list of plugins to install and activate.\n\nExample:\n\n```json {     "version": 2,     "plugins": [         "jetpack",         "akismet@6.4.3",         "./query-monitor.php",         "./code-block.zip",         {             "source": "https://github.com/woocommerce/woocommerce/archive/refs/heads/6.4.3.zip",             "active": false         }     ] } ```'
    },
    muPlugins: {
      type: "array",
      items: { $ref: "#/definitions/DataSources.DataReference" },
      description: `A list of mu-plugins to install.

Example:

\`\`\`json {     "version": 2,     "muPlugins": [         {             "filename": "addFilter-0.php",             "content": "<?php add_action( 'requests-requests.before_request', function( &$url ) {\\n$url = 'https://playground.wordpress.net/cors-proxy.php?' . $url;\\n} );"         }     ] } \`\`\``
    },
    postTypes: {
      type: "object",
      additionalProperties: {
        anyOf: [
          {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Name of the post type shown in the menu. Usually plural. Default is value of $labels['name']."
              },
              labels: {
                type: "object",
                additionalProperties: { type: "string" },
                properties: {
                  name: {
                    type: "string",
                    description: "General name for the post type, usually plural. Default is 'Posts' / 'Pages'."
                  },
                  singular_name: {
                    type: "string",
                    description: "Name for one object of this post type. Default is 'Post' / 'Page'."
                  },
                  add_new: {
                    type: "string",
                    description: "Label for adding a new item. Default is 'Add New' / 'Add New'."
                  },
                  add_new_item: {
                    type: "string",
                    description: "Label for adding a new singular item. Default is 'Add New Post' / 'Add New Page'."
                  },
                  edit_item: {
                    type: "string",
                    description: "Label for editing a singular item. Default is 'Edit Post' / 'Edit Page'."
                  },
                  new_item: {
                    type: "string",
                    description: "Label for the new item page title. Default is 'New Post' / 'New Page'."
                  },
                  view_item: {
                    type: "string",
                    description: "Label for viewing a singular item. Default is 'View Post' / 'View Page'."
                  },
                  view_items: {
                    type: "string",
                    description: "Label for viewing post type archives. Default is 'View Posts' / 'View Pages'."
                  },
                  search_items: {
                    type: "string",
                    description: "Label for searching plural items. Default is 'Search Posts' / 'Search Pages'."
                  },
                  not_found: {
                    type: "string",
                    description: "Label used when no items are found. Default is 'No posts found' / 'No pages found'."
                  },
                  not_found_in_trash: {
                    type: "string",
                    description: "Label used when no items are in the Trash. Default is 'No posts found in Trash' / 'No pages found in Trash'."
                  },
                  parent_item_colon: {
                    type: "string",
                    description: "Label used to prefix parents of hierarchical items. Default is 'Parent Page:'."
                  },
                  all_items: {
                    type: "string",
                    description: "Label to signify all items in a submenu link. Default is 'All Posts' / 'All Pages'."
                  },
                  archives: {
                    type: "string",
                    description: "Label for archives in nav menus. Default is 'Post Archives' / 'Page Archives'."
                  },
                  attributes: {
                    type: "string",
                    description: "Label for the attributes meta box. Default is 'Post Attributes' / 'Page Attributes'."
                  },
                  insert_into_item: {
                    type: "string",
                    description: "Label for the media frame button. Default is 'Insert into post' / 'Insert into page'."
                  },
                  uploaded_to_this_item: {
                    type: "string",
                    description: "Label for the media frame filter. Default is 'Uploaded to this post' / 'Uploaded to this page'."
                  },
                  featured_image: {
                    type: "string",
                    description: "Label for the featured image meta box title. Default is 'Featured image'."
                  },
                  set_featured_image: {
                    type: "string",
                    description: "Label for setting the featured image. Default is 'Set featured image'."
                  },
                  remove_featured_image: {
                    type: "string",
                    description: "Label for removing the featured image. Default is 'Remove featured image'."
                  },
                  use_featured_image: {
                    type: "string",
                    description: "Label in the media frame for using a featured image. Default is 'Use as featured image'."
                  },
                  menu_name: {
                    type: "string",
                    description: "Label for the menu name. Default is the same as name."
                  },
                  filter_items_list: {
                    type: "string",
                    description: "Label for the table views hidden heading. Default is 'Filter posts list' / 'Filter pages list'."
                  },
                  filter_by_date: {
                    type: "string",
                    description: "Label for the date filter in list tables. Default is 'Filter by date'."
                  },
                  items_list_navigation: {
                    type: "string",
                    description: "Label for the table pagination hidden heading. Default is 'Posts list navigation' / 'Pages list navigation'."
                  },
                  items_list: {
                    type: "string",
                    description: "Label for the table hidden heading. Default is 'Posts list' / 'Pages list'."
                  },
                  item_published: {
                    type: "string",
                    description: "Label used when an item is published. Default is 'Post published.' / 'Page published.'"
                  },
                  item_published_privately: {
                    type: "string",
                    description: "Label used when an item is published with private visibility. Default is 'Post published privately.' / 'Page published privately.'"
                  },
                  item_reverted_to_draft: {
                    type: "string",
                    description: "Label used when an item is switched to a draft. Default is 'Post reverted to draft.' / 'Page reverted to draft.'"
                  },
                  item_trashed: {
                    type: "string",
                    description: "Label used when an item is moved to Trash. Default is 'Post trashed.' / 'Page trashed.'"
                  },
                  item_scheduled: {
                    type: "string",
                    description: "Label used when an item is scheduled for publishing. Default is 'Post scheduled.' / 'Page scheduled.'"
                  },
                  item_updated: {
                    type: "string",
                    description: "Label used when an item is updated. Default is 'Post updated.' / 'Page updated.'"
                  },
                  item_link: {
                    type: "string",
                    description: "Title for a navigation link block variation. Default is 'Post Link' / 'Page Link'."
                  },
                  item_link_description: {
                    type: "string",
                    description: "Description for a navigation link block variation. Default is 'A link to a post.' / 'A link to a page.'"
                  }
                },
                description: `An array of labels for this post type. If not set, post labels are inherited for non-hierarchical types and page labels for hierarchical ones

The labels documented for WordPress 6.8 are listed below, and this type also supports an arbitrary set of labels to support future WordPress releases.`
              },
              description: {
                type: "string",
                description: "A short descriptive summary of what the post type is."
              },
              public: {
                type: "boolean",
                description: "Whether a post type is intended for use publicly either via the admin interface or by front-end users. While the default settings of $exclude_from_search, $publicly_queryable, $show_ui, and $show_in_nav_menus are inherited from $public, each does not rely on this relationship and controls a very specific intention. Default false."
              },
              hierarchical: {
                type: "boolean",
                description: "Whether the post type is hierarchical (e.g. page). Default false."
              },
              exclude_from_search: {
                type: "boolean",
                description: "Whether to exclude posts with this post type from front end search results. Default is the opposite value of $public."
              },
              publicly_queryable: {
                type: "boolean",
                description: `Whether queries can be performed on the front end for the post type as part of parse_request(). Endpoints would include:
* ?post_type={post_type_key}
* ?{post_type_key}={single_post_slug}
* ?{post_type_query_var}={single_post_slug} If not set, the default is inherited from $public.`
              },
              show_ui: {
                type: "boolean",
                description: "Whether to generate and allow a UI for managing this post type in the admin. Default is value of $public."
              },
              show_in_menu: {
                type: ["boolean", "string"],
                description: "Where to show the post type in the admin menu. To work, $show_ui must be true. If true, the post type is shown in its own top level menu. If false, no menu is shown. If a string of an existing top level menu ('tools.php' or 'edit.php?post_type=page', for example), the post type will be placed as a sub-menu of that. Default is value of $show_ui."
              },
              show_in_admin_bar: {
                type: "boolean",
                description: "Makes this post type available via the admin bar. Default is value of $show_in_menu."
              },
              show_in_nav_menus: {
                type: "boolean",
                description: "Makes this post type available for selection in navigation menus. Default is value of $public."
              },
              show_in_rest: {
                type: "boolean",
                description: "Whether to include the post type in the REST API. Set this to true for the post type to be available in the block editor."
              },
              rest_base: {
                type: "string",
                description: "To change the base URL of REST API route. Default is $post_type."
              },
              rest_namespace: {
                type: "string",
                description: "To change the namespace URL of REST API route. Default is wp/v2."
              },
              rest_controller_class: {
                type: "string",
                description: "REST API controller class name. Default is 'WP_REST_Posts_Controller'."
              },
              menu_icon: {
                type: "string",
                description: "The URL to the icon to be used for this menu. Pass a base64-encoded SVG using a data URI, which will be colored to match the color scheme — this should begin with 'data:image/svg+xml;base64,'. Pass the name of a Dashicons helper class to use a font icon, e.g. 'dashicons-chart-pie'. Pass 'none' to leave div.wp-menu-image empty so an icon can be added via CSS. Defaults to use the posts icon."
              },
              menu_position: {
                type: ["string", "number"],
                description: "The position in the menu order the post type should appear. To work, $show_in_menu must be true. Default null (at the bottom)."
              },
              rename_capabilities: {
                type: "boolean",
                description: "Whether to rename the capabilities for this post type."
              },
              singular_capability_name: {
                type: "string",
                description: "The singular capability name for this post type."
              },
              plural_capability_name: {
                type: "string",
                description: "The plural capability name for this post type."
              },
              taxonomies: {
                type: "array",
                items: { type: "string" },
                description: "An array of taxonomy identifiers that will be registered for the post type. Taxonomies can be registered later with register_taxonomy() or register_taxonomy_for_object_type()."
              },
              query_var_name: {
                type: "string",
                description: "The query var name for this post type."
              },
              register_meta_box_cb: {
                type: "string",
                description: "Provide a callback function that sets up the meta boxes for the edit form. Do remove_meta_box() and add_meta_box() calls in the callback. Default null."
              },
              enter_title_here: {
                type: "string",
                description: 'Custom text for the "Enter title here" placeholder in the title field.'
              },
              capability_type: {
                anyOf: [
                  { type: "string" },
                  {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 2
                  }
                ],
                description: "The string to use to build the read, edit, and delete capabilities. May be passed as an array to allow for alternative plurals when using this argument as a base to construct the capabilities, e.g. array('story', 'stories'). Default 'post'."
              },
              capabilities: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Array of capabilities for this post type. $capability_type is used as a base to construct capabilities by default. See get_post_type_capabilities()."
              },
              map_meta_cap: {
                type: "boolean",
                description: "Whether to use the internal default meta capability handling. Default false."
              },
              supports: {
                allOf: [
                  {
                    type: "array",
                    items: {
                      type: "string",
                      enum: [
                        "title",
                        "editor",
                        "author",
                        "thumbnail",
                        "excerpt",
                        "trackbacks",
                        "custom-fields",
                        "comments",
                        "revisions",
                        "page-attributes",
                        "post-formats"
                      ]
                    }
                  },
                  {
                    type: "array",
                    items: { type: "string" }
                  }
                ],
                description: `Core feature(s) the post type supports. Serves as an alias for calling add_post_type_support() directly.

Core features include 'title', 'editor', 'comments', 'revisions', 'trackbacks', 'author', 'excerpt', 'page-attributes', 'thumbnail', 'custom-fields', and 'post-formats'.

Additionally, the 'revisions' feature dictates whether the post type will store revisions, the 'autosave' feature dictates whether the post type will be autosaved, and the 'comments' feature dictates whether the comments count will show on the edit screen.

For backward compatibility reasons, adding 'editor' support implies 'autosave' support too.

A feature can also be specified as an array of arguments to provide additional information about supporting that feature.

Example: array( 'my_feature', array( 'field' => 'value' ) ).

If false, no features will be added. Default is an array containing 'title' and 'editor'.`
              },
              has_archive: {
                type: ["boolean", "string"],
                description: "Whether there should be post type archives, or if a string, the archive slug to use. Will generate the proper rewrite rules if $rewrite is enabled. Default false."
              },
              rewrite: {
                anyOf: [
                  { type: "boolean" },
                  {
                    type: "object",
                    properties: {
                      slug: { type: "string" },
                      with_front: { type: "boolean" },
                      pages: { type: "boolean" },
                      feeds: { type: "boolean" },
                      ep_mask: { type: "number" }
                    },
                    additionalProperties: !1
                  }
                ],
                description: `Triggers the handling of rewrites for this post type. To prevent rewrite, set to false. Defaults to true, using $post_type as slug. To specify rewrite rules, an array can be passed with any of these keys:
- slug (string): Customize the permastruct slug. Defaults to $post_type key.
- with_front (bool): Whether the permastruct should be prepended with WP_Rewrite::$front. Default true.
- feeds (bool): Whether the feed permastruct should be built for this post type. Default is value of $has_archive.
- pages (bool): Whether the permastruct should provide for pagination. Default true.
- ep_mask (int): Endpoint mask to assign. If not specified and permalink_epmask is set, inherits from $permalink_epmask.   If not specified and permalink_epmask is not set, defaults to EP_PERMALINK.`
              },
              query_var: {
                type: ["boolean", "string"],
                description: "Sets the query_var key for this post type. Defaults to $post_type key. If false, a post type cannot be loaded at ?{query_var}={post_slug}. If specified as a string, the query ?{query_var_string}={post_slug} will be valid."
              },
              can_export: {
                type: "boolean",
                description: "Whether to allow this post type to be exported. Default true."
              },
              delete_with_user: {
                type: "boolean",
                description: "Whether to delete posts of this type when deleting a user. If true, posts of this type belonging to the user will be moved to Trash when the user is deleted. If false, posts of this type belonging to the user will *not* be trashed or deleted. If not set (the default), posts are trashed if post type supports the 'author' feature. Otherwise posts are not trashed or deleted. Default null."
              },
              template: {
                type: "array",
                items: {
                  type: "array",
                  minItems: 2,
                  items: [
                    { type: "string" },
                    {
                      type: "object",
                      additionalProperties: {
                        anyOf: [
                          { type: "string" },
                          { type: "boolean" },
                          { type: "number" },
                          {
                            type: "array",
                            items: {
                              $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                            }
                          },
                          {
                            type: "object",
                            additionalProperties: {
                              $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                            }
                          }
                        ]
                      }
                    }
                  ],
                  maxItems: 2
                },
                description: "Array of blocks to use as the default initial state for an editor session. Each item should be an array containing block name and optional attributes."
              },
              template_lock: {
                type: ["string", "boolean"],
                enum: ["all", "insert", !1],
                description: "Whether the block template should be locked if $template is set. If set to 'all', the user is unable to insert new blocks, move existing blocks and delete blocks. If set to 'insert', the user is able to move existing blocks but is unable to insert new blocks and delete blocks. Default false."
              }
            },
            additionalProperties: !1
          },
          { $ref: "#/definitions/DataSources.ExecutionContextPath" }
        ]
      },
      propertyNames: { pattern: "^[a-z0-9_-]{1,20}$" },
      description: `Very basic schema for defining custom post types.

IMPORTANT: Using this property requires an explicit inclusion of the \`secure-custom-fields\` plugin. If it's missing, the Blueprint runner will throw an error.

See https://github.com/WordPress/blueprints-library/issues/32 for more context.`
    },
    fonts: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { $ref: "#/definitions/DataSources.FileDataReference" },
          {
            type: "object",
            properties: {
              $schema: {
                type: "string",
                description: "JSON schema URI for font-collection.json."
              },
              font_families: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    font_family_settings: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Name of the font family preset, translatable."
                        },
                        slug: {
                          type: "string",
                          description: "Kebab-case unique identifier for the font family preset."
                        },
                        fontFamily: {
                          type: "string",
                          description: "CSS font-family value."
                        },
                        preview: {
                          type: "string",
                          description: "URL to a preview image of the font family."
                        },
                        fontFace: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              preview: {
                                type: "string",
                                description: "URL to a preview image of the font."
                              },
                              fontFamily: {
                                type: "string",
                                description: "CSS font-family value."
                              },
                              fontStyle: {
                                type: "string",
                                description: "CSS font-style value."
                              },
                              fontWeight: {
                                type: [
                                  "string",
                                  "number"
                                ],
                                description: "List of available font weights, separated by a space."
                              },
                              fontDisplay: {
                                type: "string",
                                enum: [
                                  "auto",
                                  "block",
                                  "fallback",
                                  "swap",
                                  "optional"
                                ],
                                description: "CSS font-display value."
                              },
                              src: {
                                anyOf: [
                                  {
                                    $ref: "#/definitions/DataSources.FileDataReference"
                                  },
                                  {
                                    type: "array",
                                    items: {
                                      $ref: "#/definitions/DataSources.FileDataReference"
                                    }
                                  }
                                ],
                                description: "Paths or URLs to the font files."
                              },
                              fontStretch: {
                                type: "string",
                                description: "CSS font-stretch value."
                              },
                              ascentOverride: {
                                type: "string",
                                description: "CSS ascent-override value."
                              },
                              descentOverride: {
                                type: "string",
                                description: "CSS descent-override value."
                              },
                              fontVariant: {
                                type: "string",
                                description: "CSS font-variant value."
                              },
                              fontFeatureSettings: {
                                type: "string",
                                description: "CSS font-feature-settings value."
                              },
                              fontVariationSettings: {
                                type: "string",
                                description: "CSS font-variation-settings value."
                              },
                              lineGapOverride: {
                                type: "string",
                                description: "CSS line-gap-override value."
                              },
                              sizeAdjust: {
                                type: "string",
                                description: "CSS size-adjust value."
                              },
                              unicodeRange: {
                                type: "string",
                                description: "CSS unicode-range value."
                              }
                            },
                            required: [
                              "fontFamily",
                              "src"
                            ],
                            additionalProperties: !1,
                            description: "Font face settings with added preview property."
                          },
                          description: "Array of font-face definitions."
                        }
                      },
                      required: [
                        "name",
                        "slug",
                        "fontFamily"
                      ],
                      additionalProperties: !1,
                      description: "Font family settings with added preview property."
                    },
                    categories: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of category slugs."
                    }
                  },
                  required: ["font_family_settings"],
                  additionalProperties: !1
                },
                description: "Array of font families ready to be installed."
              }
            },
            required: ["font_families"],
            additionalProperties: !1,
            description: "Font collection schema for WordPress Font Library."
          }
        ]
      },
      description: 'A list of fonts to register in the site\'s Font Library.\n\nExample:\n\n```json fonts: {     "open-sans": "https://example.com/fonts/open-sans.woff2",     "roboto": "./wp-content/fonts/roboto.woff2" } ```\n\nOr using the full font collection schema:\n\n```json fonts: {     "my-collection": {         "font_families": [             {                 "font_family_settings": {                     "name": "Open Sans",                     "slug": "open-sans",                     "fontFamily": "Open Sans",                     "preview": "https://example.com/previews/open-sans.png",                     "fontFace": [                         {                             "fontFamily": "Open Sans",                             "fontWeight": "400",                             "fontStyle": "normal",                             "src": "./wp-content/fonts/open-sans-regular.woff2"                         }                     ]                 },                 "categories": ["sans-serif"]             }         ]     } } ```'
    },
    media: {
      type: "array",
      items: {
        anyOf: [
          { $ref: "#/definitions/DataSources.FileDataReference" },
          {
            type: "object",
            properties: {
              source: {
                $ref: "#/definitions/DataSources.FileDataReference"
              },
              title: { type: "string" },
              description: { type: "string" },
              alt: { type: "string" },
              caption: { type: "string" }
            },
            required: ["source"],
            additionalProperties: !1
          }
        ]
      },
      description: 'A list of media files to upload to the WordPress Media Library – in formats supported by the WordPress Media Library.\n\nExample:\n\n```json media: [     "https://example.com/images/hero.jpg",     "./wp-content/uploads/2024/01/logo.png",     {         "source": "https://example.com/videos/intro.mp4",         "title": "Introduction Video",         "description": "A brief introduction to our company",         "alt": "Company introduction video"     },     {         "source": "./wp-content/uploads/2024/01/brochure.pdf",         "title": "Product Brochure",         "description": "Detailed information about our products"     } ] ```'
    },
    content: {
      type: "array",
      items: {
        type: "object",
        discriminator: { propertyName: "type" },
        required: ["type"],
        oneOf: [
          {
            type: "object",
            properties: {
              type: { type: "string", const: "mysql-dump" },
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.FileDataReference"
                  },
                  {
                    type: "array",
                    items: {
                      $ref: "#/definitions/DataSources.FileDataReference"
                    }
                  }
                ]
              }
            },
            required: ["type", "source"],
            additionalProperties: !1
          },
          {
            type: "object",
            additionalProperties: !1,
            properties: {
              urlsMode: {
                type: "string",
                enum: ["rewrite", "preserve"],
                description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                default: '"rewrite".'
              },
              urlsMap: {
                type: "object",
                additionalProperties: {
                  $ref: "#/definitions/DataSources.URLReference"
                },
                description: "A mapping of base URLs to rewrite.",
                propertyNames: {
                  $ref: "#/definitions/DataSources.URLReference"
                }
              },
              type: { type: "string", const: "posts" },
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.FileDataReference"
                  },
                  {
                    type: "object",
                    properties: {
                      post_author: {
                        type: "number",
                        description: `Username of the post author.

If missing, the default value will be resolved in the following order until one is available:

* Default user defined in the runner configuration.
* The first administrator in the database.
* The first user in the database.
* A newly created user.

The aggressive resolution is necessary because post_author is NOT NULL in the database schema.`
                      },
                      post_date: {
                        type: "string",
                        description: "The date of the post in UTC. Accepts format 'YYYY-MM-DD HH:MM:SS'. Can be used to schedule future posts (when used with post_status: 'future').",
                        default: "Current time"
                      },
                      post_content: {
                        type: "string",
                        description: "The main post content. Can contain HTML, shortcodes, etc. While technically optional, posts are usually expected to have content.",
                        default: ""
                      },
                      post_title: {
                        type: "string",
                        description: "The post title."
                      },
                      post_excerpt: {
                        type: "string",
                        description: "The post excerpt. Default empty."
                      },
                      post_status: {
                        type: "string",
                        enum: [
                          "publish",
                          "pending",
                          "draft",
                          "auto-draft",
                          "future",
                          "private",
                          "inherit",
                          "trash"
                        ],
                        description: "The post status"
                      },
                      post_type: {
                        type: "string",
                        description: "The post type (e.g., 'post', 'page'). Default 'post'."
                      },
                      comment_status: {
                        type: "string",
                        enum: ["open", "closed"],
                        description: "Whether comments are allowed ('open' or 'closed').",
                        default: "'open'."
                      },
                      post_password: {
                        type: "string",
                        description: "A password to protect access. Default empty."
                      },
                      post_name: {
                        type: "string",
                        description: "The URL slug. Default sanitized post_title for new posts."
                      },
                      post_parent_name: {
                        type: "string",
                        description: "Post parent name for hierarchical post types (e.g., pages). Default empty."
                      },
                      menu_order: {
                        type: "number",
                        description: "Menu order within a post type. Default 0."
                      },
                      post_mime_type: {
                        type: "string",
                        description: "MIME type for attachments. Default empty."
                      },
                      guid: {
                        type: "string",
                        description: "Global Unique ID. Default empty."
                      },
                      post_category: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of category slugs. Defaults to the site's default category."
                      },
                      post_tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of tag names. Default empty."
                      },
                      tax_input: {
                        type: "object",
                        additionalProperties: {
                          type: "array",
                          items: { type: "string" }
                        },
                        description: 'Taxonomy terms keyed by taxonomy name. For hierarchical taxonomies: array of term names. For non-hierarchical: array of term names or slugs.\n\nExamples: ```json tax_input: {   // For hierarchical taxonomies like categories   "category": ["Books", "Fiction", "Science Fiction"],\n\n  // For non-hierarchical taxonomies like tags   "post_tag": ["bestseller", "featured", "summer-reading"],\n\n  // For custom taxonomies   "genre": ["mystery", "thriller"],   "author": ["Jane Doe", "John Smith"] } ```'
                      },
                      meta_input: {
                        type: "object",
                        additionalProperties: {
                          anyOf: [
                            { type: "string" },
                            { type: "boolean" },
                            { type: "number" },
                            {
                              type: "array",
                              items: {
                                $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                              }
                            },
                            {
                              type: "object",
                              additionalProperties: {
                                $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                              }
                            }
                          ]
                        },
                        description: 'Post meta keyed by meta key to value. Default empty.\n\nExamples: ```json meta_input: {   // Simple values   "price": "19.99",   "in_stock": true,   "stock": 42,\n\n  // Array values   "related_products": [123, 456, 789],   "product_colors": ["red", "blue", "green"],\n\n  // Object values   "_product_attributes": {     "color": {       "name": "Color",       "value": "Red",       "position": 0,       "visible": true     }   },   "seo_data": {     "title": "Custom SEO Title",     "description": "Custom meta description",     "keywords": ["product", "featured"]   } } ```'
                      },
                      page_template: {
                        type: "string",
                        description: "Specifies the page template file to use. This parameter only applies if post_type is 'page'. For other post types, it's ignored. Provide the template filename (e.g., 'template-contact.php'). Include subdirectory if applicable (e.g., 'templates/full-width.php'). To set a template for non-page post types, use meta_input with key '_wp_page_template'.",
                        default: ""
                      }
                    },
                    required: ["post_title"],
                    additionalProperties: !1,
                    description: "Post data type. It is inspired by the wp_insert_post() arguments, but it diverges from it in a few ways."
                  },
                  {
                    type: "array",
                    items: {
                      anyOf: [
                        {
                          $ref: "#/definitions/DataSources.FileDataReference"
                        },
                        {
                          type: "object",
                          properties: {
                            post_author: {
                              type: "number",
                              description: `Username of the post author.

If missing, the default value will be resolved in the following order until one is available:

* Default user defined in the runner configuration.
* The first administrator in the database.
* The first user in the database.
* A newly created user.

The aggressive resolution is necessary because post_author is NOT NULL in the database schema.`
                            },
                            post_date: {
                              type: "string",
                              description: "The date of the post in UTC. Accepts format 'YYYY-MM-DD HH:MM:SS'. Can be used to schedule future posts (when used with post_status: 'future').",
                              default: "Current time"
                            },
                            post_content: {
                              type: "string",
                              description: "The main post content. Can contain HTML, shortcodes, etc. While technically optional, posts are usually expected to have content.",
                              default: ""
                            },
                            post_title: {
                              type: "string",
                              description: "The post title."
                            },
                            post_excerpt: {
                              type: "string",
                              description: "The post excerpt. Default empty."
                            },
                            post_status: {
                              type: "string",
                              enum: [
                                "publish",
                                "pending",
                                "draft",
                                "auto-draft",
                                "future",
                                "private",
                                "inherit",
                                "trash"
                              ],
                              description: "The post status"
                            },
                            post_type: {
                              type: "string",
                              description: "The post type (e.g., 'post', 'page'). Default 'post'."
                            },
                            comment_status: {
                              type: "string",
                              enum: [
                                "open",
                                "closed"
                              ],
                              description: "Whether comments are allowed ('open' or 'closed').",
                              default: "'open'."
                            },
                            post_password: {
                              type: "string",
                              description: "A password to protect access. Default empty."
                            },
                            post_name: {
                              type: "string",
                              description: "The URL slug. Default sanitized post_title for new posts."
                            },
                            post_parent_name: {
                              type: "string",
                              description: "Post parent name for hierarchical post types (e.g., pages). Default empty."
                            },
                            menu_order: {
                              type: "number",
                              description: "Menu order within a post type. Default 0."
                            },
                            post_mime_type: {
                              type: "string",
                              description: "MIME type for attachments. Default empty."
                            },
                            guid: {
                              type: "string",
                              description: "Global Unique ID. Default empty."
                            },
                            post_category: {
                              type: "array",
                              items: {
                                type: "string"
                              },
                              description: "Array of category slugs. Defaults to the site's default category."
                            },
                            post_tags: {
                              type: "array",
                              items: {
                                type: "string"
                              },
                              description: "Array of tag names. Default empty."
                            },
                            tax_input: {
                              type: "object",
                              additionalProperties: {
                                type: "array",
                                items: {
                                  type: "string"
                                }
                              },
                              description: 'Taxonomy terms keyed by taxonomy name. For hierarchical taxonomies: array of term names. For non-hierarchical: array of term names or slugs.\n\nExamples: ```json tax_input: {   // For hierarchical taxonomies like categories   "category": ["Books", "Fiction", "Science Fiction"],\n\n  // For non-hierarchical taxonomies like tags   "post_tag": ["bestseller", "featured", "summer-reading"],\n\n  // For custom taxonomies   "genre": ["mystery", "thriller"],   "author": ["Jane Doe", "John Smith"] } ```'
                            },
                            meta_input: {
                              type: "object",
                              additionalProperties: {
                                anyOf: [
                                  {
                                    type: "string"
                                  },
                                  {
                                    type: "boolean"
                                  },
                                  {
                                    type: "number"
                                  },
                                  {
                                    type: "array",
                                    items: {
                                      $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                    }
                                  },
                                  {
                                    type: "object",
                                    additionalProperties: {
                                      $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                    }
                                  }
                                ]
                              },
                              description: 'Post meta keyed by meta key to value. Default empty.\n\nExamples: ```json meta_input: {   // Simple values   "price": "19.99",   "in_stock": true,   "stock": 42,\n\n  // Array values   "related_products": [123, 456, 789],   "product_colors": ["red", "blue", "green"],\n\n  // Object values   "_product_attributes": {     "color": {       "name": "Color",       "value": "Red",       "position": 0,       "visible": true     }   },   "seo_data": {     "title": "Custom SEO Title",     "description": "Custom meta description",     "keywords": ["product", "featured"]   } } ```'
                            },
                            page_template: {
                              type: "string",
                              description: "Specifies the page template file to use. This parameter only applies if post_type is 'page'. For other post types, it's ignored. Provide the template filename (e.g., 'template-contact.php'). Include subdirectory if applicable (e.g., 'templates/full-width.php'). To set a template for non-page post types, use meta_input with key '_wp_page_template'.",
                              default: ""
                            }
                          },
                          required: ["post_title"],
                          additionalProperties: !1,
                          description: "Post data type. It is inspired by the wp_insert_post() arguments, but it diverges from it in a few ways."
                        }
                      ]
                    }
                  }
                ]
              }
            },
            required: ["source", "type"]
          },
          {
            type: "object",
            properties: { type: { type: "string", const: "wxr" } },
            required: ["type"],
            oneOf: [
              {
                type: "object",
                additionalProperties: !1,
                properties: {
                  authorsMode: {
                    type: "string",
                    const: "map",
                    description: "Map remote authors to existing local authors."
                  },
                  authorsMap: {
                    type: "object",
                    additionalProperties: {
                      type: "string"
                    }
                  },
                  urlsMode: {
                    type: "string",
                    enum: ["rewrite", "preserve"],
                    description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                    default: '"rewrite".'
                  },
                  urlsMap: {
                    type: "object",
                    additionalProperties: {
                      $ref: "#/definitions/DataSources.URLReference"
                    },
                    description: "A mapping of base URLs to rewrite.",
                    propertyNames: {
                      $ref: "#/definitions/DataSources.URLReference"
                    }
                  },
                  type: { type: "string", const: "wxr" },
                  source: {
                    anyOf: [
                      {
                        $ref: "#/definitions/DataSources.FileDataReference"
                      },
                      {
                        type: "array",
                        items: {
                          $ref: "#/definitions/DataSources.FileDataReference"
                        }
                      }
                    ]
                  },
                  staticAssets: {
                    type: "string",
                    enum: ["fetch", "hotlink"],
                    description: `Static assets handling.

Possible values:

* "fetch" – Fetch the static assets and save them to the local filesystem.
* "hotlink" – Hotlink the static assets from the remote site.`,
                    default: '"fetch".'
                  },
                  defaultAuthorUsername: {
                    type: "string",
                    description: 'The default author to use when `mode` is "default-author".',
                    default: '"admin".'
                  },
                  importUsers: {
                    type: "boolean",
                    description: "Whether to import users from the remote site.",
                    default: "false."
                  },
                  importComments: {
                    type: "boolean",
                    description: "Whether to import comments from the remote site.",
                    default: "false."
                  }
                },
                required: [
                  "authorsMap",
                  "authorsMode",
                  "source",
                  "type"
                ]
              },
              {
                type: "object",
                additionalProperties: !1,
                properties: {
                  authorsMode: {
                    type: "string",
                    enum: ["create", "default-author"],
                    description: `How to handle authors that don't exist on the current site.

Possible values:

* "create" – Create a new author.
* "default-author" – Use the default author.`,
                    default: '"create".'
                  },
                  authorsMap: {
                    type: "object",
                    additionalProperties: {
                      type: "string"
                    }
                  },
                  urlsMode: {
                    type: "string",
                    enum: ["rewrite", "preserve"],
                    description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                    default: '"rewrite".'
                  },
                  urlsMap: {
                    type: "object",
                    additionalProperties: {
                      $ref: "#/definitions/DataSources.URLReference"
                    },
                    description: "A mapping of base URLs to rewrite.",
                    propertyNames: {
                      $ref: "#/definitions/DataSources.URLReference"
                    }
                  },
                  type: { type: "string", const: "wxr" },
                  source: {
                    anyOf: [
                      {
                        $ref: "#/definitions/DataSources.FileDataReference"
                      },
                      {
                        type: "array",
                        items: {
                          $ref: "#/definitions/DataSources.FileDataReference"
                        }
                      }
                    ]
                  },
                  staticAssets: {
                    type: "string",
                    enum: ["fetch", "hotlink"],
                    description: `Static assets handling.

Possible values:

* "fetch" – Fetch the static assets and save them to the local filesystem.
* "hotlink" – Hotlink the static assets from the remote site.`,
                    default: '"fetch".'
                  },
                  defaultAuthorUsername: {
                    type: "string",
                    description: 'The default author to use when `mode` is "default-author".',
                    default: '"admin".'
                  },
                  importUsers: {
                    type: "boolean",
                    description: "Whether to import users from the remote site.",
                    default: "false."
                  },
                  importComments: {
                    type: "boolean",
                    description: "Whether to import comments from the remote site.",
                    default: "false."
                  }
                },
                required: ["source", "type"]
              }
            ]
          }
        ]
      }
    },
    users: {
      type: "array",
      items: {
        type: "object",
        properties: {
          username: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          meta: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        },
        required: ["username", "email", "role", "meta"],
        additionalProperties: !1
      }
    },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          capabilities: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        },
        required: ["name", "capabilities"],
        additionalProperties: !1
      }
    },
    additionalStepsAfterExecution: {
      type: "array",
      items: {
        type: "object",
        discriminator: { propertyName: "step" },
        required: ["step"],
        oneOf: [
          {
            type: "object",
            properties: {
              step: { type: "string", const: "activatePlugin" },
              pluginPath: {
                type: "string",
                description: "Path to the plugin directory as absolute path (/wordpress/wp-content/plugins/plugin-name); or the plugin entry file relative to the plugins directory (plugin-name/plugin-name.php)."
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the plugin for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "steps": [         {             "step": "activatePlugin",             "pluginPath": "wordpress-seo/wp-seo.php",             "humanReadableName": "Yoast SEO"         }     ] } ```\n\nThe progress bar will show "Activating Yoast SEO" instead of "Activating wordpress-seo/wp-seo.php".'
              }
            },
            required: ["step", "pluginPath"],
            additionalProperties: !1,
            description: "}}}"
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "activateTheme" },
              themeDirectoryName: {
                type: "string",
                description: "The name of the theme directory inside wp-content/themes/"
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the theme for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "steps": [         {             "step": "activateTheme",             "themeDirectoryName": "twentytwentythree",             "humanReadableName": "Twenty Twenty-Three"         }     ] } ```\n\nThe progress bar will show "Activating Twenty Twenty-Three" instead of "Activating twentytwentythree".'
              }
            },
            required: ["step", "themeDirectoryName"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "cp" },
              fromPath: { type: "string" },
              toPath: { type: "string" }
            },
            required: ["step", "fromPath", "toPath"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "defineConstants" },
              constants: {
                type: "object",
                additionalProperties: {
                  type: ["boolean", "string", "number"]
                },
                properties: {
                  WP_DEBUG: { type: "boolean" },
                  WP_DEBUG_LOG: { type: "boolean" },
                  WP_DEBUG_DISPLAY: { type: "boolean" },
                  SCRIPT_DEBUG: { type: "boolean" }
                }
              }
            },
            required: ["step", "constants"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: {
                type: "string",
                const: "enableMultisite",
                description: "Converts the target WordPress installation into a multisite network."
              }
            },
            required: ["step"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "importContent" },
              content: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          const: "mysql-dump"
                        },
                        source: {
                          anyOf: [
                            {
                              $ref: "#/definitions/DataSources.FileDataReference"
                            },
                            {
                              type: "array",
                              items: {
                                $ref: "#/definitions/DataSources.FileDataReference"
                              }
                            }
                          ]
                        }
                      },
                      required: ["type", "source"],
                      additionalProperties: !1
                    },
                    {
                      type: "object",
                      additionalProperties: !1,
                      properties: {
                        urlsMode: {
                          type: "string",
                          enum: [
                            "rewrite",
                            "preserve"
                          ],
                          description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                          default: '"rewrite".'
                        },
                        urlsMap: {
                          type: "object",
                          additionalProperties: {
                            $ref: "#/definitions/DataSources.URLReference"
                          },
                          description: "A mapping of base URLs to rewrite.",
                          propertyNames: {
                            $ref: "#/definitions/DataSources.URLReference"
                          }
                        },
                        type: {
                          type: "string",
                          const: "posts"
                        },
                        source: {
                          anyOf: [
                            {
                              $ref: "#/definitions/DataSources.FileDataReference"
                            },
                            {
                              type: "object",
                              properties: {
                                post_author: {
                                  type: "number",
                                  description: `Username of the post author.

If missing, the default value will be resolved in the following order until one is available:

* Default user defined in the runner configuration.
* The first administrator in the database.
* The first user in the database.
* A newly created user.

The aggressive resolution is necessary because post_author is NOT NULL in the database schema.`
                                },
                                post_date: {
                                  type: "string",
                                  description: "The date of the post in UTC. Accepts format 'YYYY-MM-DD HH:MM:SS'. Can be used to schedule future posts (when used with post_status: 'future').",
                                  default: "Current time"
                                },
                                post_content: {
                                  type: "string",
                                  description: "The main post content. Can contain HTML, shortcodes, etc. While technically optional, posts are usually expected to have content.",
                                  default: ""
                                },
                                post_title: {
                                  type: "string",
                                  description: "The post title."
                                },
                                post_excerpt: {
                                  type: "string",
                                  description: "The post excerpt. Default empty."
                                },
                                post_status: {
                                  type: "string",
                                  enum: [
                                    "publish",
                                    "pending",
                                    "draft",
                                    "auto-draft",
                                    "future",
                                    "private",
                                    "inherit",
                                    "trash"
                                  ],
                                  description: "The post status"
                                },
                                post_type: {
                                  type: "string",
                                  description: "The post type (e.g., 'post', 'page'). Default 'post'."
                                },
                                comment_status: {
                                  type: "string",
                                  enum: [
                                    "open",
                                    "closed"
                                  ],
                                  description: "Whether comments are allowed ('open' or 'closed').",
                                  default: "'open'."
                                },
                                post_password: {
                                  type: "string",
                                  description: "A password to protect access. Default empty."
                                },
                                post_name: {
                                  type: "string",
                                  description: "The URL slug. Default sanitized post_title for new posts."
                                },
                                post_parent_name: {
                                  type: "string",
                                  description: "Post parent name for hierarchical post types (e.g., pages). Default empty."
                                },
                                menu_order: {
                                  type: "number",
                                  description: "Menu order within a post type. Default 0."
                                },
                                post_mime_type: {
                                  type: "string",
                                  description: "MIME type for attachments. Default empty."
                                },
                                guid: {
                                  type: "string",
                                  description: "Global Unique ID. Default empty."
                                },
                                post_category: {
                                  type: "array",
                                  items: {
                                    type: "string"
                                  },
                                  description: "Array of category slugs. Defaults to the site's default category."
                                },
                                post_tags: {
                                  type: "array",
                                  items: {
                                    type: "string"
                                  },
                                  description: "Array of tag names. Default empty."
                                },
                                tax_input: {
                                  type: "object",
                                  additionalProperties: {
                                    type: "array",
                                    items: {
                                      type: "string"
                                    }
                                  },
                                  description: 'Taxonomy terms keyed by taxonomy name. For hierarchical taxonomies: array of term names. For non-hierarchical: array of term names or slugs.\n\nExamples: ```json tax_input: {   // For hierarchical taxonomies like categories   "category": ["Books", "Fiction", "Science Fiction"],\n\n  // For non-hierarchical taxonomies like tags   "post_tag": ["bestseller", "featured", "summer-reading"],\n\n  // For custom taxonomies   "genre": ["mystery", "thriller"],   "author": ["Jane Doe", "John Smith"] } ```'
                                },
                                meta_input: {
                                  type: "object",
                                  additionalProperties: {
                                    anyOf: [
                                      {
                                        type: "string"
                                      },
                                      {
                                        type: "boolean"
                                      },
                                      {
                                        type: "number"
                                      },
                                      {
                                        type: "array",
                                        items: {
                                          $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                        }
                                      },
                                      {
                                        type: "object",
                                        additionalProperties: {
                                          $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                        }
                                      }
                                    ]
                                  },
                                  description: 'Post meta keyed by meta key to value. Default empty.\n\nExamples: ```json meta_input: {   // Simple values   "price": "19.99",   "in_stock": true,   "stock": 42,\n\n  // Array values   "related_products": [123, 456, 789],   "product_colors": ["red", "blue", "green"],\n\n  // Object values   "_product_attributes": {     "color": {       "name": "Color",       "value": "Red",       "position": 0,       "visible": true     }   },   "seo_data": {     "title": "Custom SEO Title",     "description": "Custom meta description",     "keywords": ["product", "featured"]   } } ```'
                                },
                                page_template: {
                                  type: "string",
                                  description: "Specifies the page template file to use. This parameter only applies if post_type is 'page'. For other post types, it's ignored. Provide the template filename (e.g., 'template-contact.php'). Include subdirectory if applicable (e.g., 'templates/full-width.php'). To set a template for non-page post types, use meta_input with key '_wp_page_template'.",
                                  default: ""
                                }
                              },
                              required: [
                                "post_title"
                              ],
                              additionalProperties: !1,
                              description: "Post data type. It is inspired by the wp_insert_post() arguments, but it diverges from it in a few ways."
                            },
                            {
                              type: "array",
                              items: {
                                anyOf: [
                                  {
                                    $ref: "#/definitions/DataSources.FileDataReference"
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      post_author: {
                                        type: "number",
                                        description: `Username of the post author.

If missing, the default value will be resolved in the following order until one is available:

* Default user defined in the runner configuration.
* The first administrator in the database.
* The first user in the database.
* A newly created user.

The aggressive resolution is necessary because post_author is NOT NULL in the database schema.`
                                      },
                                      post_date: {
                                        type: "string",
                                        description: "The date of the post in UTC. Accepts format 'YYYY-MM-DD HH:MM:SS'. Can be used to schedule future posts (when used with post_status: 'future').",
                                        default: "Current time"
                                      },
                                      post_content: {
                                        type: "string",
                                        description: "The main post content. Can contain HTML, shortcodes, etc. While technically optional, posts are usually expected to have content.",
                                        default: ""
                                      },
                                      post_title: {
                                        type: "string",
                                        description: "The post title."
                                      },
                                      post_excerpt: {
                                        type: "string",
                                        description: "The post excerpt. Default empty."
                                      },
                                      post_status: {
                                        type: "string",
                                        enum: [
                                          "publish",
                                          "pending",
                                          "draft",
                                          "auto-draft",
                                          "future",
                                          "private",
                                          "inherit",
                                          "trash"
                                        ],
                                        description: "The post status"
                                      },
                                      post_type: {
                                        type: "string",
                                        description: "The post type (e.g., 'post', 'page'). Default 'post'."
                                      },
                                      comment_status: {
                                        type: "string",
                                        enum: [
                                          "open",
                                          "closed"
                                        ],
                                        description: "Whether comments are allowed ('open' or 'closed').",
                                        default: "'open'."
                                      },
                                      post_password: {
                                        type: "string",
                                        description: "A password to protect access. Default empty."
                                      },
                                      post_name: {
                                        type: "string",
                                        description: "The URL slug. Default sanitized post_title for new posts."
                                      },
                                      post_parent_name: {
                                        type: "string",
                                        description: "Post parent name for hierarchical post types (e.g., pages). Default empty."
                                      },
                                      menu_order: {
                                        type: "number",
                                        description: "Menu order within a post type. Default 0."
                                      },
                                      post_mime_type: {
                                        type: "string",
                                        description: "MIME type for attachments. Default empty."
                                      },
                                      guid: {
                                        type: "string",
                                        description: "Global Unique ID. Default empty."
                                      },
                                      post_category: {
                                        type: "array",
                                        items: {
                                          type: "string"
                                        },
                                        description: "Array of category slugs. Defaults to the site's default category."
                                      },
                                      post_tags: {
                                        type: "array",
                                        items: {
                                          type: "string"
                                        },
                                        description: "Array of tag names. Default empty."
                                      },
                                      tax_input: {
                                        type: "object",
                                        additionalProperties: {
                                          type: "array",
                                          items: {
                                            type: "string"
                                          }
                                        },
                                        description: 'Taxonomy terms keyed by taxonomy name. For hierarchical taxonomies: array of term names. For non-hierarchical: array of term names or slugs.\n\nExamples: ```json tax_input: {   // For hierarchical taxonomies like categories   "category": ["Books", "Fiction", "Science Fiction"],\n\n  // For non-hierarchical taxonomies like tags   "post_tag": ["bestseller", "featured", "summer-reading"],\n\n  // For custom taxonomies   "genre": ["mystery", "thriller"],   "author": ["Jane Doe", "John Smith"] } ```'
                                      },
                                      meta_input: {
                                        type: "object",
                                        additionalProperties: {
                                          anyOf: [
                                            {
                                              type: "string"
                                            },
                                            {
                                              type: "boolean"
                                            },
                                            {
                                              type: "number"
                                            },
                                            {
                                              type: "array",
                                              items: {
                                                $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                              }
                                            },
                                            {
                                              type: "object",
                                              additionalProperties: {
                                                $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                                              }
                                            }
                                          ]
                                        },
                                        description: 'Post meta keyed by meta key to value. Default empty.\n\nExamples: ```json meta_input: {   // Simple values   "price": "19.99",   "in_stock": true,   "stock": 42,\n\n  // Array values   "related_products": [123, 456, 789],   "product_colors": ["red", "blue", "green"],\n\n  // Object values   "_product_attributes": {     "color": {       "name": "Color",       "value": "Red",       "position": 0,       "visible": true     }   },   "seo_data": {     "title": "Custom SEO Title",     "description": "Custom meta description",     "keywords": ["product", "featured"]   } } ```'
                                      },
                                      page_template: {
                                        type: "string",
                                        description: "Specifies the page template file to use. This parameter only applies if post_type is 'page'. For other post types, it's ignored. Provide the template filename (e.g., 'template-contact.php'). Include subdirectory if applicable (e.g., 'templates/full-width.php'). To set a template for non-page post types, use meta_input with key '_wp_page_template'.",
                                        default: ""
                                      }
                                    },
                                    required: [
                                      "post_title"
                                    ],
                                    additionalProperties: !1,
                                    description: "Post data type. It is inspired by the wp_insert_post() arguments, but it diverges from it in a few ways."
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      },
                      required: ["source", "type"]
                    },
                    {
                      type: "object",
                      additionalProperties: !1,
                      properties: {
                        authorsMode: {
                          type: "string",
                          const: "map",
                          description: "Map remote authors to existing local authors."
                        },
                        authorsMap: {
                          type: "object",
                          additionalProperties: {
                            type: "string"
                          }
                        },
                        urlsMode: {
                          type: "string",
                          enum: [
                            "rewrite",
                            "preserve"
                          ],
                          description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                          default: '"rewrite".'
                        },
                        urlsMap: {
                          type: "object",
                          additionalProperties: {
                            $ref: "#/definitions/DataSources.URLReference"
                          },
                          description: "A mapping of base URLs to rewrite.",
                          propertyNames: {
                            $ref: "#/definitions/DataSources.URLReference"
                          }
                        },
                        type: {
                          type: "string",
                          const: "wxr"
                        },
                        source: {
                          anyOf: [
                            {
                              $ref: "#/definitions/DataSources.FileDataReference"
                            },
                            {
                              type: "array",
                              items: {
                                $ref: "#/definitions/DataSources.FileDataReference"
                              }
                            }
                          ]
                        },
                        staticAssets: {
                          type: "string",
                          enum: ["fetch", "hotlink"],
                          description: `Static assets handling.

Possible values:

* "fetch" – Fetch the static assets and save them to the local filesystem.
* "hotlink" – Hotlink the static assets from the remote site.`,
                          default: '"fetch".'
                        },
                        defaultAuthorUsername: {
                          type: "string",
                          description: 'The default author to use when `mode` is "default-author".',
                          default: '"admin".'
                        },
                        importUsers: {
                          type: "boolean",
                          description: "Whether to import users from the remote site.",
                          default: "false."
                        },
                        importComments: {
                          type: "boolean",
                          description: "Whether to import comments from the remote site.",
                          default: "false."
                        }
                      },
                      required: [
                        "authorsMap",
                        "authorsMode",
                        "source",
                        "type"
                      ]
                    },
                    {
                      type: "object",
                      additionalProperties: !1,
                      properties: {
                        authorsMode: {
                          type: "string",
                          enum: [
                            "create",
                            "default-author"
                          ],
                          description: `How to handle authors that don't exist on the current site.

Possible values:

* "create" – Create a new author.
* "default-author" – Use the default author.`,
                          default: '"create".'
                        },
                        authorsMap: {
                          type: "object",
                          additionalProperties: {
                            type: "string"
                          }
                        },
                        urlsMode: {
                          type: "string",
                          enum: [
                            "rewrite",
                            "preserve"
                          ],
                          description: `Whether to rewrite the hrefs in the remote site's content URLs in the WXR file from the remote site domain to the current site domain's (and path etc).

Possible values:

* "rewrite" – Rewrite the hrefs to the current site domain's (and path etc).
* "preserve" – Preserve the hrefs as they are.`,
                          default: '"rewrite".'
                        },
                        urlsMap: {
                          type: "object",
                          additionalProperties: {
                            $ref: "#/definitions/DataSources.URLReference"
                          },
                          description: "A mapping of base URLs to rewrite.",
                          propertyNames: {
                            $ref: "#/definitions/DataSources.URLReference"
                          }
                        },
                        type: {
                          type: "string",
                          const: "wxr"
                        },
                        source: {
                          anyOf: [
                            {
                              $ref: "#/definitions/DataSources.FileDataReference"
                            },
                            {
                              type: "array",
                              items: {
                                $ref: "#/definitions/DataSources.FileDataReference"
                              }
                            }
                          ]
                        },
                        staticAssets: {
                          type: "string",
                          enum: ["fetch", "hotlink"],
                          description: `Static assets handling.

Possible values:

* "fetch" – Fetch the static assets and save them to the local filesystem.
* "hotlink" – Hotlink the static assets from the remote site.`,
                          default: '"fetch".'
                        },
                        defaultAuthorUsername: {
                          type: "string",
                          description: 'The default author to use when `mode` is "default-author".',
                          default: '"admin".'
                        },
                        importUsers: {
                          type: "boolean",
                          description: "Whether to import users from the remote site.",
                          default: "false."
                        },
                        importComments: {
                          type: "boolean",
                          description: "Whether to import comments from the remote site.",
                          default: "false."
                        }
                      },
                      required: ["source", "type"]
                    }
                  ]
                }
              }
            },
            required: ["step", "content"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "importMedia" },
              media: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      $ref: "#/definitions/DataSources.FileDataReference"
                    },
                    {
                      type: "object",
                      properties: {
                        source: {
                          $ref: "#/definitions/DataSources.FileDataReference"
                        },
                        title: { type: "string" },
                        description: { type: "string" },
                        alt: { type: "string" },
                        caption: { type: "string" }
                      },
                      required: ["source"],
                      additionalProperties: !1
                    }
                  ]
                }
              }
            },
            required: ["step", "media"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: {
                type: "string",
                const: "importThemeStarterContent"
              },
              themeSlug: {
                type: "string",
                description: "The name of the theme to import content from."
              }
            },
            required: ["step"],
            additionalProperties: !1
          },
          {
            type: "object",
            additionalProperties: !1,
            properties: {
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.DataReference"
                  },
                  {
                    $ref: "#/definitions/DataSources.PluginDirectoryReference"
                  }
                ]
              },
              active: {
                type: "boolean",
                description: "Whether to activate the plugin.",
                default: "true."
              },
              activationOptions: {
                type: "object",
                additionalProperties: {
                  anyOf: [
                    { type: "string" },
                    { type: "boolean" },
                    { type: "number" },
                    {
                      type: "array",
                      items: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    },
                    {
                      type: "object",
                      additionalProperties: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    }
                  ]
                },
                description: `Parameters to pass to the plugin during activation.

These options are stored in a site option that the plugin can access during its activation hook. The option name is:

\`\`\`php 'blueprint_activation_' . plugin_basename( __FILE__ ) \`\`\`

This ensures uniqueness even when multiple versions of the same plugin exist. This is similar to how the \`register_activation_hook\` function requires the plugin file path as its first argument.

The Blueprint runner will remove the option after activating the plugin.

Example:

In the Blueprint: \`\`\`json {     "source": "woocommerce",     "activationOptions": {         "storeCity": "Wrocław",         "storeCountry": "Poland",         "storePostalCode": "53-607"     } } \`\`\`

In the plugin's activation hook:

\`\`\`php register_activation_hook( __FILE__, function( $network_wide ) {     // Get the activation options from the transient     $option_name = 'blueprint_activation_' . plugin_basename( __FILE__ );     $blueprint_activation_options = get_option( $option_name ) ?? [];

    if ( $blueprint_activation_options ) {         $store_city = $blueprint_activation_options['storeCity'] ?? '';         $store_country = $blueprint_activation_options['storeCountry'] ?? '';         $store_postal_code = $blueprint_activation_options['storePostalCode'] ?? '';

        // ...do something with the options...     }

    // Continue with normal activation... } ); \`\`\``
              },
              targetDirectoryName: {
                type: "string",
                description: "An explicit directory name within wp-content/plugins to install the plugin at. If not provided, it will be inferred from the plugin source.",
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              onError: {
                type: "string",
                enum: ["skip-plugin", "throw"],
                description: `Sometimes it's fine when a plugin fails to install.

Use-case:   Compatibility testing. A Blueprint may install WordPress nightly with   a number of plugins to test. Some of those plugins may not yet be compatible   with the latest version of WordPress. This is something to take not of,   but not a strong reason to fail the entire Blueprint installation.`,
                default: "throw"
              },
              ifAlreadyInstalled: {
                type: "string",
                enum: ["overwrite", "skip", "error"],
                description: "How to handle a plugin that is already installed.",
                default: "overwrite"
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the plugin for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "plugins": [         {             "source": "https://github.com/Automattic/jetpack/archive/refs/heads/beta.zip",             "humanReadableName": "Jetpack Beta"         }     ] } ```\n\nThe progress bar will show "Installing Jetpack Beta plugin" instead of "Installing https://github.com/Automattic/jetpack/archive/refs/heads/beta.zip".'
              },
              step: { type: "string", const: "installPlugin" }
            },
            required: ["source", "step"]
          },
          {
            type: "object",
            additionalProperties: !1,
            properties: {
              source: {
                anyOf: [
                  {
                    $ref: "#/definitions/DataSources.ThemeDirectoryReference"
                  },
                  {
                    $ref: "#/definitions/DataSources.DataReference"
                  }
                ]
              },
              importStarterContent: {
                type: "boolean",
                description: "Whether to import the theme's starter content after installing it."
              },
              targetDirectoryName: {
                type: "string",
                description: "An explicit directory name within wp-content/themes to install the theme at. If not provided, it will be inferred from the theme source.",
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              onError: {
                type: "string",
                enum: ["skip-theme", "throw"],
                description: "Sometimes it's fine when a theme fails to install.",
                default: "throw"
              },
              ifAlreadyInstalled: {
                type: "string",
                enum: ["overwrite", "skip", "error"],
                description: "How to handle a theme that is already installed.",
                default: "overwrite"
              },
              humanReadableName: {
                type: "string",
                description: 'Human-readable name of the theme for the progress bar.\n\nFor example, with the following Blueprint:\n\n```json {     "themes": [         {             "source": "https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip",             "humanReadableName": "Adventurer"         }     ] } ```\n\nThe progress bar will show "Installing Adventurer theme" instead of "Installing https://github.com/Automattic/adventurer/archive/refs/heads/beta.zip".'
              },
              step: { type: "string", const: "installTheme" },
              active: {
                type: "boolean",
                description: "Whether to activate the theme after installing it.\n\nThis is not a part of the theme definition. Only the step can explicitly provide this option. The default value is `true`."
              }
            },
            required: ["source", "step"]
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "mkdir" },
              path: { type: "string" }
            },
            required: ["step", "path"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "mv" },
              fromPath: { type: "string" },
              toPath: { type: "string" }
            },
            required: ["step", "fromPath", "toPath"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "rm" },
              path: { type: "string" }
            },
            required: ["step", "path"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "rmdir" },
              path: { type: "string" }
            },
            required: ["step", "path"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "resetData" },
              contentTypes: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["posts", "pages", "comments"],
                  description: "Content types created by a vanilla WordPress installation and controlled by `contentBaseline`."
                },
                description: "Content types to remove. When omitted, all posts, pages, custom post types, and comments are removed."
              }
            },
            required: ["step"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "runPHP" },
              code: {
                $ref: "#/definitions/DataSources.FileDataReference",
                description: "The PHP file to execute."
              },
              env: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Environment variables to set for this run."
              }
            },
            required: ["step", "code"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "runSQL" },
              source: {
                $ref: "#/definitions/DataSources.FileDataReference"
              }
            },
            required: ["step", "source"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "setSiteLanguage" },
              language: {
                type: "string",
                description: "The language to set, e.g. 'en_US'"
              }
            },
            required: ["step", "language"],
            additionalProperties: !1,
            description: "Sets the site language and download translations for WordPress core and all the installed plugins and themes."
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "setSiteOptions" },
              options: {
                type: "object",
                additionalProperties: {
                  anyOf: [
                    { type: "string" },
                    { type: "boolean" },
                    { type: "number" },
                    {
                      type: "array",
                      items: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    },
                    {
                      type: "object",
                      additionalProperties: {
                        $ref: "#/definitions/alias-1337903113-152187-152281-1337903113-104333-152295-1337903113-104299-152295-1337903113-0-169608"
                      }
                    }
                  ]
                }
              }
            },
            required: ["step", "options"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "unzip" },
              zipFile: {
                $ref: "#/definitions/DataSources.FileDataReference",
                description: "The zip file resource to extract."
              },
              extractToPath: {
                type: "string",
                description: "The path to extract the zip file to inside the virtual filesystem."
              }
            },
            required: ["step", "zipFile", "extractToPath"],
            additionalProperties: !1,
            description: `Unzips a file. While this step is not strictly necessary, it is very convenient for:

* Working with GitHub releases that output doubly zipped data.
* Preprocessing zipped data before using them in the Blueprint.`
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "wp-cli" },
              command: { type: "string" },
              wpCliPath: { type: "string" }
            },
            required: ["step", "command"],
            additionalProperties: !1
          },
          {
            type: "object",
            properties: {
              step: { type: "string", const: "writeFiles" },
              files: {
                type: "object",
                additionalProperties: {
                  $ref: "#/definitions/DataSources.DataReference"
                }
              }
            },
            required: ["step", "files"],
            additionalProperties: !1
          }
        ]
      }
    }
  }
}, te = Object.prototype.hasOwnProperty, Z = (h) => {
  try {
    const s = new URL(h);
    return (s.protocol === "http:" || s.protocol === "https:") && s.hostname !== "";
  } catch {
    return !1;
  }
}, Ue = new RegExp("^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$", "u"), vt = new RegExp(
  "^(?:latest|beta|trunk|nightly|none|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$",
  "u"
), yt = new RegExp(
  "^\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?$",
  "u"
), St = new RegExp(
  "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$",
  "u"
), xt = new RegExp("^(?:latest|next|\\d+\\.\\d+(?:\\.\\d+)?)$", "u"), lt = new RegExp("^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$", "u"), ae = new RegExp("^(?!(?:\\.|\\.\\.)$)[^/]+$", "u"), Et = new RegExp("^[a-z0-9_-]{1,20}$", "u"), ft = { validate: Te };
function Te(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.files === void 0) {
      const V = {
        instancePath: s,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "files" },
        message: "must have required property 'files'"
      };
      e === null ? e = [V] : e.push(V), t++;
    }
    for (const V in h)
      if (V !== "files") {
        const j = {
          instancePath: s,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: V },
          message: "must NOT have additional properties"
        };
        e === null ? e = [j] : e.push(j), t++;
      }
    if (h.files !== void 0) {
      let V = h.files;
      if (V && typeof V == "object" && !Array.isArray(V)) {
        for (const j in V) {
          const $ = t;
          if (typeof j == "string" && !ae.test(j)) {
            const J = {
              instancePath: s + "/files",
              schemaPath: "#/properties/files/propertyNames/pattern",
              keyword: "pattern",
              params: {
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"',
              propertyName: j
            };
            e === null ? e = [J] : e.push(J), t++;
          }
          var I = $ === t;
          if (!I) {
            const J = {
              instancePath: s + "/files",
              schemaPath: "#/properties/files/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: j },
              message: "property name must be valid"
            };
            e === null ? e = [J] : e.push(J), t++;
          }
        }
        for (const j in V) {
          let $ = V[j];
          const J = t;
          let L = !1;
          const Oe = t;
          if (typeof $ != "string") {
            const U = {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/files/additionalProperties/anyOf/0/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [U] : e.push(U), t++;
          }
          var q = Oe === t;
          if (L = L || q, !L) {
            const U = t;
            ft.validate($, {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              parentData: V,
              parentDataProperty: j,
              rootData: D
            }) || (e = e === null ? ft.validate.errors : e.concat(ft.validate.errors), t = e.length);
            var q = U === t;
            L = L || q;
          }
          if (L)
            t = J, e !== null && (J ? e.length = J : e = null);
          else {
            const U = {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/files/additionalProperties/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [U] : e.push(U), t++;
          }
        }
      } else {
        const j = {
          instancePath: s + "/files",
          schemaPath: "#/properties/files/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [j] : e.push(j), t++;
      }
    }
  } else {
    const V = {
      instancePath: s,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object"
    };
    e === null ? e = [V] : e.push(V), t++;
  }
  return Te.errors = e, t === 0;
}
function Ne(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.directoryName === void 0) {
      const V = {
        instancePath: s,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "directoryName" },
        message: "must have required property 'directoryName'"
      };
      e === null ? e = [V] : e.push(V), t++;
    }
    if (h.files === void 0) {
      const V = {
        instancePath: s,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "files" },
        message: "must have required property 'files'"
      };
      e === null ? e = [V] : e.push(V), t++;
    }
    for (const V in h)
      if (!(V === "directoryName" || V === "files")) {
        const j = {
          instancePath: s,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: V },
          message: "must NOT have additional properties"
        };
        e === null ? e = [j] : e.push(j), t++;
      }
    if (h.directoryName !== void 0) {
      let V = h.directoryName;
      if (typeof V == "string") {
        if (!ae.test(V)) {
          const j = {
            instancePath: s + "/directoryName",
            schemaPath: "#/properties/directoryName/pattern",
            keyword: "pattern",
            params: { pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$" },
            message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
          };
          e === null ? e = [j] : e.push(j), t++;
        }
      } else {
        const j = {
          instancePath: s + "/directoryName",
          schemaPath: "#/properties/directoryName/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [j] : e.push(j), t++;
      }
    }
    if (h.files !== void 0) {
      let V = h.files;
      if (V && typeof V == "object" && !Array.isArray(V)) {
        for (const j in V) {
          const $ = t;
          if (typeof j == "string" && !ae.test(j)) {
            const J = {
              instancePath: s + "/files",
              schemaPath: "#/properties/files/propertyNames/pattern",
              keyword: "pattern",
              params: {
                pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
              },
              message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"',
              propertyName: j
            };
            e === null ? e = [J] : e.push(J), t++;
          }
          var I = $ === t;
          if (!I) {
            const J = {
              instancePath: s + "/files",
              schemaPath: "#/properties/files/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: j },
              message: "property name must be valid"
            };
            e === null ? e = [J] : e.push(J), t++;
          }
        }
        for (const j in V) {
          let $ = V[j];
          const J = t;
          let L = !1;
          const Oe = t;
          if (typeof $ != "string") {
            const U = {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/files/additionalProperties/anyOf/0/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [U] : e.push(U), t++;
          }
          var q = Oe === t;
          if (L = L || q, !L) {
            const U = t;
            Te($, {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              parentData: V,
              parentDataProperty: j,
              rootData: D
            }) || (e = e === null ? Te.errors : e.concat(Te.errors), t = e.length);
            var q = U === t;
            L = L || q;
          }
          if (L)
            t = J, e !== null && (J ? e.length = J : e = null);
          else {
            const U = {
              instancePath: s + "/files/" + j.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/files/additionalProperties/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [U] : e.push(U), t++;
          }
        }
      } else {
        const j = {
          instancePath: s + "/files",
          schemaPath: "#/properties/files/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [j] : e.push(j), t++;
      }
    }
  } else {
    const V = {
      instancePath: s,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object"
    };
    e === null ? e = [V] : e.push(V), t++;
  }
  return Ne.errors = e, t === 0;
}
const Dt = new RegExp("^(?!.*(?:^|/)\\.\\.(?:/|$)).*$", "u");
function Fe(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.gitRepository === void 0) {
      const I = {
        instancePath: s,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "gitRepository" },
        message: "must have required property 'gitRepository'"
      };
      e === null ? e = [I] : e.push(I), t++;
    }
    for (const I in h)
      if (!(I === "gitRepository" || I === "ref" || I === "pathInRepository")) {
        const q = {
          instancePath: s,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: I },
          message: "must NOT have additional properties"
        };
        e === null ? e = [q] : e.push(q), t++;
      }
    if (h.gitRepository !== void 0) {
      let I = h.gitRepository;
      if (typeof I == "string") {
        if (!Z(I)) {
          const q = {
            instancePath: s + "/gitRepository",
            schemaPath: "#/definitions/DataSources.URLReference/format",
            keyword: "format",
            params: { format: "whatwg-http-url" },
            message: 'must match format "whatwg-http-url"'
          };
          e === null ? e = [q] : e.push(q), t++;
        }
      } else {
        const q = {
          instancePath: s + "/gitRepository",
          schemaPath: "#/definitions/DataSources.URLReference/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [q] : e.push(q), t++;
      }
    }
    if (h.ref !== void 0 && typeof h.ref != "string") {
      const I = {
        instancePath: s + "/ref",
        schemaPath: "#/properties/ref/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [I] : e.push(I), t++;
    }
    if (h.pathInRepository !== void 0) {
      let I = h.pathInRepository;
      if (typeof I == "string") {
        if (!Dt.test(I)) {
          const q = {
            instancePath: s + "/pathInRepository",
            schemaPath: "#/properties/pathInRepository/pattern",
            keyword: "pattern",
            params: { pattern: "^(?!.*(?:^|/)\\.\\.(?:/|$)).*$" },
            message: 'must match pattern "^(?!.*(?:^|/)\\.\\.(?:/|$)).*$"'
          };
          e === null ? e = [q] : e.push(q), t++;
        }
      } else {
        const q = {
          instancePath: s + "/pathInRepository",
          schemaPath: "#/properties/pathInRepository/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [q] : e.push(q), t++;
      }
    }
  } else {
    const I = {
      instancePath: s,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object"
    };
    e === null ? e = [I] : e.push(I), t++;
  }
  return Fe.errors = e, t === 0;
}
function W(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !1;
  const V = t;
  if (typeof h == "string") {
    if (!Z(h)) {
      const $ = {
        instancePath: s,
        schemaPath: "#/definitions/DataSources.URLReference/format",
        keyword: "format",
        params: { format: "whatwg-http-url" },
        message: 'must match format "whatwg-http-url"'
      };
      e === null ? e = [$] : e.push($), t++;
    }
  } else {
    const $ = {
      instancePath: s,
      schemaPath: "#/definitions/DataSources.URLReference/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  var j = V === t;
  if (q = q || j, !q) {
    const $ = t;
    if (typeof h == "string") {
      if (!Ue.test(h)) {
        const L = {
          instancePath: s,
          schemaPath: "#/definitions/DataSources.ExecutionContextPath/pattern",
          keyword: "pattern",
          params: {
            pattern: "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"
          },
          message: 'must match pattern "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"'
        };
        e === null ? e = [L] : e.push(L), t++;
      }
    } else {
      const L = {
        instancePath: s,
        schemaPath: "#/definitions/DataSources.ExecutionContextPath/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [L] : e.push(L), t++;
    }
    var j = $ === t;
    if (q = q || j, !q) {
      const L = t;
      if (h && typeof h == "object" && !Array.isArray(h)) {
        if (h.filename === void 0) {
          const U = {
            instancePath: s,
            schemaPath: "#/definitions/DataSources.InlineFile/required",
            keyword: "required",
            params: { missingProperty: "filename" },
            message: "must have required property 'filename'"
          };
          e === null ? e = [U] : e.push(U), t++;
        }
        if (h.content === void 0) {
          const U = {
            instancePath: s,
            schemaPath: "#/definitions/DataSources.InlineFile/required",
            keyword: "required",
            params: { missingProperty: "content" },
            message: "must have required property 'content'"
          };
          e === null ? e = [U] : e.push(U), t++;
        }
        for (const U in h)
          if (!(U === "filename" || U === "content")) {
            const se = {
              instancePath: s,
              schemaPath: "#/definitions/DataSources.InlineFile/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: U },
              message: "must NOT have additional properties"
            };
            e === null ? e = [se] : e.push(se), t++;
          }
        if (h.filename !== void 0) {
          let U = h.filename;
          if (typeof U == "string") {
            if (!ae.test(U)) {
              const se = {
                instancePath: s + "/filename",
                schemaPath: "#/definitions/DataSources.InlineFile/properties/filename/pattern",
                keyword: "pattern",
                params: {
                  pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                },
                message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
              };
              e === null ? e = [se] : e.push(se), t++;
            }
          } else {
            const se = {
              instancePath: s + "/filename",
              schemaPath: "#/definitions/DataSources.InlineFile/properties/filename/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [se] : e.push(se), t++;
          }
        }
        if (h.content !== void 0 && typeof h.content != "string") {
          const U = {
            instancePath: s + "/content",
            schemaPath: "#/definitions/DataSources.InlineFile/properties/content/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [U] : e.push(U), t++;
        }
      } else {
        const U = {
          instancePath: s,
          schemaPath: "#/definitions/DataSources.InlineFile/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [U] : e.push(U), t++;
      }
      var j = L === t;
      if (q = q || j, !q) {
        const U = t;
        Ne(h, {
          instancePath: s,
          parentData: Y,
          parentDataProperty: X,
          rootData: D
        }) || (e = e === null ? Ne.errors : e.concat(Ne.errors), t = e.length);
        var j = U === t;
        if (q = q || j, !q) {
          const z = t;
          Fe(h, {
            instancePath: s,
            parentData: Y,
            parentDataProperty: X,
            rootData: D
          }) || (e = e === null ? Fe.errors : e.concat(Fe.errors), t = e.length);
          var j = z === t;
          q = q || j;
        }
      }
    }
  }
  if (q)
    t = I, e !== null && (I ? e.length = I : e = null);
  else {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  return W.errors = e, t === 0;
}
function ee(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !1;
  const V = t;
  if (typeof h != "string") {
    const $ = {
      instancePath: s,
      schemaPath: "#/definitions/DataSources.Slug/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  var j = V === t;
  if (q = q || j, !q) {
    const $ = t;
    if (typeof h != "string") {
      const L = {
        instancePath: s,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [L] : e.push(L), t++;
    }
    var j = $ === t;
    q = q || j;
  }
  if (q)
    t = I, e !== null && (I ? e.length = I : e = null);
  else {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  return ee.errors = e, t === 0;
}
function ie(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !1;
  const V = t;
  if (typeof h != "string") {
    const $ = {
      instancePath: s,
      schemaPath: "#/definitions/DataSources.Slug/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  var j = V === t;
  if (q = q || j, !q) {
    const $ = t;
    if (typeof h != "string") {
      const L = {
        instancePath: s,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [L] : e.push(L), t++;
    }
    var j = $ === t;
    q = q || j;
  }
  if (q)
    t = I, e !== null && (I ? e.length = I : e = null);
  else {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  return ie.errors = e, t === 0;
}
const we = { validate: C };
function C(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !1;
  const V = t;
  if (typeof h != "string") {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf/0/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  var j = V === t;
  if (q = q || j, !q) {
    const $ = t;
    if (typeof h != "boolean") {
      const L = {
        instancePath: s,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "boolean" },
        message: "must be boolean"
      };
      e === null ? e = [L] : e.push(L), t++;
    }
    var j = $ === t;
    if (q = q || j, !q) {
      const L = t;
      if (!(typeof h == "number" && isFinite(h))) {
        const U = {
          instancePath: s,
          schemaPath: "#/anyOf/2/type",
          keyword: "type",
          params: { type: "number" },
          message: "must be number"
        };
        e === null ? e = [U] : e.push(U), t++;
      }
      var j = L === t;
      if (q = q || j, !q) {
        const U = t;
        if (Array.isArray(h)) {
          const z = h.length;
          for (let K = 0; K < z; K++)
            we.validate(h[K], {
              instancePath: s + "/" + K,
              parentData: h,
              parentDataProperty: K,
              rootData: D
            }) || (e = e === null ? we.validate.errors : e.concat(we.validate.errors), t = e.length);
        } else {
          const z = {
            instancePath: s,
            schemaPath: "#/anyOf/3/type",
            keyword: "type",
            params: { type: "array" },
            message: "must be array"
          };
          e === null ? e = [z] : e.push(z), t++;
        }
        var j = U === t;
        if (q = q || j, !q) {
          const z = t;
          if (h && typeof h == "object" && !Array.isArray(h))
            for (const oe in h)
              we.validate(h[oe], {
                instancePath: s + "/" + oe.replace(/~/g, "~0").replace(/\//g, "~1"),
                parentData: h,
                parentDataProperty: oe,
                rootData: D
              }) || (e = e === null ? we.validate.errors : e.concat(
                we.validate.errors
              ), t = e.length);
          else {
            const oe = {
              instancePath: s,
              schemaPath: "#/anyOf/4/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [oe] : e.push(oe), t++;
          }
          var j = z === t;
          q = q || j;
        }
      }
    }
  }
  if (q)
    t = I, e !== null && (I ? e.length = I : e = null);
  else {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  return C.errors = e, t === 0;
}
const Tt = new RegExp(
  "^site:(?!\\/*$)(?!\\.\\.(?:/|$))(?!.*\\/\\.\\.(?:/|$)).+$",
  "u"
);
function R(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !1;
  const V = t;
  if (typeof h == "string") {
    if (!Z(h)) {
      const $ = {
        instancePath: s,
        schemaPath: "#/definitions/DataSources.URLReference/format",
        keyword: "format",
        params: { format: "whatwg-http-url" },
        message: 'must match format "whatwg-http-url"'
      };
      e === null ? e = [$] : e.push($), t++;
    }
  } else {
    const $ = {
      instancePath: s,
      schemaPath: "#/definitions/DataSources.URLReference/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  var j = V === t;
  if (q = q || j, !q) {
    const $ = t;
    if (typeof h == "string") {
      if (!Ue.test(h)) {
        const L = {
          instancePath: s,
          schemaPath: "#/definitions/DataSources.ExecutionContextPath/pattern",
          keyword: "pattern",
          params: {
            pattern: "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"
          },
          message: 'must match pattern "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"'
        };
        e === null ? e = [L] : e.push(L), t++;
      }
    } else {
      const L = {
        instancePath: s,
        schemaPath: "#/definitions/DataSources.ExecutionContextPath/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [L] : e.push(L), t++;
    }
    var j = $ === t;
    if (q = q || j, !q) {
      const L = t;
      if (typeof h == "string") {
        if (!Tt.test(h)) {
          const U = {
            instancePath: s,
            schemaPath: "#/definitions/DataSources.TargetSitePath/pattern",
            keyword: "pattern",
            params: {
              pattern: "^site:(?!\\/*$)(?!\\.\\.(?:/|$))(?!.*\\/\\.\\.(?:/|$)).+$"
            },
            message: 'must match pattern "^site:(?!\\/*$)(?!\\.\\.(?:/|$))(?!.*\\/\\.\\.(?:/|$)).+$"'
          };
          e === null ? e = [U] : e.push(U), t++;
        }
      } else {
        const U = {
          instancePath: s,
          schemaPath: "#/definitions/DataSources.TargetSitePath/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [U] : e.push(U), t++;
      }
      var j = L === t;
      if (q = q || j, !q) {
        const U = t;
        if (h && typeof h == "object" && !Array.isArray(h)) {
          if (h.filename === void 0) {
            const z = {
              instancePath: s,
              schemaPath: "#/definitions/DataSources.InlineFile/required",
              keyword: "required",
              params: { missingProperty: "filename" },
              message: "must have required property 'filename'"
            };
            e === null ? e = [z] : e.push(z), t++;
          }
          if (h.content === void 0) {
            const z = {
              instancePath: s,
              schemaPath: "#/definitions/DataSources.InlineFile/required",
              keyword: "required",
              params: { missingProperty: "content" },
              message: "must have required property 'content'"
            };
            e === null ? e = [z] : e.push(z), t++;
          }
          for (const z in h)
            if (!(z === "filename" || z === "content")) {
              const K = {
                instancePath: s,
                schemaPath: "#/definitions/DataSources.InlineFile/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: z },
                message: "must NOT have additional properties"
              };
              e === null ? e = [K] : e.push(K), t++;
            }
          if (h.filename !== void 0) {
            let z = h.filename;
            if (typeof z == "string") {
              if (!ae.test(z)) {
                const K = {
                  instancePath: s + "/filename",
                  schemaPath: "#/definitions/DataSources.InlineFile/properties/filename/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                  },
                  message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                };
                e === null ? e = [K] : e.push(K), t++;
              }
            } else {
              const K = {
                instancePath: s + "/filename",
                schemaPath: "#/definitions/DataSources.InlineFile/properties/filename/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [K] : e.push(K), t++;
            }
          }
          if (h.content !== void 0 && typeof h.content != "string") {
            const z = {
              instancePath: s + "/content",
              schemaPath: "#/definitions/DataSources.InlineFile/properties/content/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [z] : e.push(z), t++;
          }
        } else {
          const z = {
            instancePath: s,
            schemaPath: "#/definitions/DataSources.InlineFile/type",
            keyword: "type",
            params: { type: "object" },
            message: "must be object"
          };
          e === null ? e = [z] : e.push(z), t++;
        }
        var j = U === t;
        q = q || j;
      }
    }
  }
  if (q)
    t = I, e !== null && (I ? e.length = I : e = null);
  else {
    const $ = {
      instancePath: s,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    e === null ? e = [$] : e.push($), t++;
  }
  return R.errors = e, t === 0;
}
function Ie(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  const I = t;
  let q = !0;
  const V = t;
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.usersBaseline === void 0) {
      const m = {};
      e === null ? e = [m] : e.push(m), t++;
    } else if (h.usersBaseline !== void 0 && h.usersBaseline !== "empty") {
      const m = {};
      e === null ? e = [m] : e.push(m), t++;
    }
  }
  var j = V === t;
  if (t = I, e !== null && (I ? e.length = I : e = null), j) {
    const m = t;
    if (h && typeof h == "object" && !Array.isArray(h)) {
      if (h.contentBaseline === void 0) {
        const r = {
          instancePath: s,
          schemaPath: "#/allOf/0/then/required",
          keyword: "required",
          params: { missingProperty: "contentBaseline" },
          message: "must have required property 'contentBaseline'"
        };
        e === null ? e = [r] : e.push(r), t++;
      }
      if (h.users === void 0) {
        const r = {
          instancePath: s,
          schemaPath: "#/allOf/0/then/required",
          keyword: "required",
          params: { missingProperty: "users" },
          message: "must have required property 'users'"
        };
        e === null ? e = [r] : e.push(r), t++;
      }
      if (h.contentBaseline !== void 0 && h.contentBaseline !== "empty") {
        const r = {
          instancePath: s + "/contentBaseline",
          schemaPath: "#/allOf/0/then/properties/contentBaseline/const",
          keyword: "const",
          params: { allowedValue: "empty" },
          message: "must be equal to constant"
        };
        e === null ? e = [r] : e.push(r), t++;
      }
      if (h.users !== void 0) {
        let r = h.users;
        if (Array.isArray(r)) {
          const o = t, P = r.length;
          for (let i = 0; i < P; i++) {
            let a = r[i];
            const n = t;
            if (a && typeof a == "object" && !Array.isArray(a)) {
              if (a.role === void 0) {
                const f = {
                  instancePath: s + "/users/" + i,
                  schemaPath: "#/allOf/0/then/properties/users/contains/required",
                  keyword: "required",
                  params: { missingProperty: "role" },
                  message: "must have required property 'role'"
                };
                e === null ? e = [f] : e.push(f), t++;
              }
              if (a.role !== void 0 && a.role !== "administrator") {
                const f = {
                  instancePath: s + "/users/" + i + "/role",
                  schemaPath: "#/allOf/0/then/properties/users/contains/properties/role/const",
                  keyword: "const",
                  params: {
                    allowedValue: "administrator"
                  },
                  message: "must be equal to constant"
                };
                e === null ? e = [f] : e.push(f), t++;
              }
            } else {
              const f = {
                instancePath: s + "/users/" + i,
                schemaPath: "#/allOf/0/then/properties/users/contains/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            var $ = n === t;
            if ($)
              break;
          }
          if ($)
            t = o, e !== null && (o ? e.length = o : e = null);
          else {
            const i = {
              instancePath: s + "/users",
              schemaPath: "#/allOf/0/then/properties/users/contains",
              keyword: "contains",
              params: { minContains: 1 },
              message: "must contain at least 1 valid item(s)"
            };
            e === null ? e = [i] : e.push(i), t++;
          }
        } else {
          const o = {
            instancePath: s + "/users",
            schemaPath: "#/allOf/0/then/properties/users/type",
            keyword: "type",
            params: { type: "array" },
            message: "must be array"
          };
          e === null ? e = [o] : e.push(o), t++;
        }
      }
    }
    var j = m === t;
    q = j;
  }
  if (!q) {
    const m = {
      instancePath: s,
      schemaPath: "#/allOf/0/if",
      keyword: "if",
      params: { failingKeyword: "then" },
      message: 'must match "then" schema'
    };
    e === null ? e = [m] : e.push(m), t++;
  }
  const J = t;
  let L = !0;
  const Oe = t;
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.wordpressVersion === void 0) {
      const m = {};
      e === null ? e = [m] : e.push(m), t++;
    } else if (h.wordpressVersion !== void 0 && h.wordpressVersion !== "none") {
      const m = {};
      e === null ? e = [m] : e.push(m), t++;
    }
  }
  var U = Oe === t;
  if (t = J, e !== null && (J ? e.length = J : e = null), U) {
    const m = t;
    if (h && typeof h == "object" && !Array.isArray(h)) {
      if (h.contentBaseline !== void 0) {
        const r = {
          instancePath: s + "/contentBaseline",
          schemaPath: "#/allOf/1/then/properties/contentBaseline/false schema",
          keyword: "false schema",
          params: {},
          message: "boolean schema is false"
        };
        e === null ? e = [r] : e.push(r), t++;
      }
      if (h.usersBaseline !== void 0) {
        const r = {
          instancePath: s + "/usersBaseline",
          schemaPath: "#/allOf/1/then/properties/usersBaseline/false schema",
          keyword: "false schema",
          params: {},
          message: "boolean schema is false"
        };
        e === null ? e = [r] : e.push(r), t++;
      }
    }
    var U = m === t;
    L = U;
  }
  if (!L) {
    const m = {
      instancePath: s,
      schemaPath: "#/allOf/1/if",
      keyword: "if",
      params: { failingKeyword: "then" },
      message: 'must match "then" schema'
    };
    e === null ? e = [m] : e.push(m), t++;
  }
  if (h && typeof h == "object" && !Array.isArray(h)) {
    if (h.version === void 0) {
      const m = {
        instancePath: s,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "version" },
        message: "must have required property 'version'"
      };
      e === null ? e = [m] : e.push(m), t++;
    }
    for (const m in h)
      if (!te.call(M.properties, m)) {
        const p = {
          instancePath: s,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: m },
          message: "must NOT have additional properties"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    if (h.version !== void 0) {
      let m = h.version;
      if (!(typeof m == "number" && isFinite(m))) {
        const p = {
          instancePath: s + "/version",
          schemaPath: "#/properties/version/type",
          keyword: "type",
          params: { type: "number" },
          message: "must be number"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
      if (m !== 2) {
        const p = {
          instancePath: s + "/version",
          schemaPath: "#/properties/version/const",
          keyword: "const",
          params: { allowedValue: 2 },
          message: "must be equal to constant"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.$schema !== void 0) {
      let m = h.$schema;
      const p = t;
      let r = !1;
      const o = t;
      if (typeof m == "string") {
        if (!Z(m)) {
          const P = {
            instancePath: s + "/$schema",
            schemaPath: "#/definitions/DataSources.URLReference/format",
            keyword: "format",
            params: { format: "whatwg-http-url" },
            message: 'must match format "whatwg-http-url"'
          };
          e === null ? e = [P] : e.push(P), t++;
        }
      } else {
        const P = {
          instancePath: s + "/$schema",
          schemaPath: "#/definitions/DataSources.URLReference/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
      var se = o === t;
      if (r = r || se, !r) {
        const P = t;
        if (typeof m == "string") {
          if (!Ue.test(m)) {
            const a = {
              instancePath: s + "/$schema",
              schemaPath: "#/definitions/DataSources.ExecutionContextPath/pattern",
              keyword: "pattern",
              params: {
                pattern: "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"
              },
              message: 'must match pattern "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"'
            };
            e === null ? e = [a] : e.push(a), t++;
          }
        } else {
          const a = {
            instancePath: s + "/$schema",
            schemaPath: "#/definitions/DataSources.ExecutionContextPath/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [a] : e.push(a), t++;
        }
        var se = P === t;
        r = r || se;
      }
      if (r)
        t = p, e !== null && (p ? e.length = p : e = null);
      else {
        const P = {
          instancePath: s + "/$schema",
          schemaPath: "#/properties/%24schema/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
    }
    if (h.blueprintMeta !== void 0) {
      let m = h.blueprintMeta;
      if (m && typeof m == "object" && !Array.isArray(m)) {
        for (const p in m)
          if (!te.call(
            M.properties.blueprintMeta.properties,
            p
          )) {
            const r = {
              instancePath: s + "/blueprintMeta",
              schemaPath: "#/properties/blueprintMeta/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: p },
              message: "must NOT have additional properties"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        if (m.name !== void 0 && typeof m.name != "string") {
          const p = {
            instancePath: s + "/blueprintMeta/name",
            schemaPath: "#/properties/blueprintMeta/properties/name/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.description !== void 0 && typeof m.description != "string") {
          const p = {
            instancePath: s + "/blueprintMeta/description",
            schemaPath: "#/properties/blueprintMeta/properties/description/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.moreInfo !== void 0 && typeof m.moreInfo != "string") {
          const p = {
            instancePath: s + "/blueprintMeta/moreInfo",
            schemaPath: "#/properties/blueprintMeta/properties/moreInfo/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.version !== void 0 && typeof m.version != "string") {
          const p = {
            instancePath: s + "/blueprintMeta/version",
            schemaPath: "#/properties/blueprintMeta/properties/version/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.authors !== void 0) {
          let p = m.authors;
          if (Array.isArray(p)) {
            const r = p.length;
            for (let o = 0; o < r; o++)
              if (typeof p[o] != "string") {
                const P = {
                  instancePath: s + "/blueprintMeta/authors/" + o,
                  schemaPath: "#/properties/blueprintMeta/properties/authors/items/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [P] : e.push(P), t++;
              }
          } else {
            const r = {
              instancePath: s + "/blueprintMeta/authors",
              schemaPath: "#/properties/blueprintMeta/properties/authors/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        }
        if (m.homepage !== void 0) {
          let p = m.homepage;
          if (typeof p == "string") {
            if (!Z(p)) {
              const r = {
                instancePath: s + "/blueprintMeta/homepage",
                schemaPath: "#/definitions/DataSources.URLReference/format",
                keyword: "format",
                params: { format: "whatwg-http-url" },
                message: 'must match format "whatwg-http-url"'
              };
              e === null ? e = [r] : e.push(r), t++;
            }
          } else {
            const r = {
              instancePath: s + "/blueprintMeta/homepage",
              schemaPath: "#/definitions/DataSources.URLReference/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        }
        if (m.donateLink !== void 0) {
          let p = m.donateLink;
          if (typeof p == "string") {
            if (!Z(p)) {
              const r = {
                instancePath: s + "/blueprintMeta/donateLink",
                schemaPath: "#/definitions/DataSources.URLReference/format",
                keyword: "format",
                params: { format: "whatwg-http-url" },
                message: 'must match format "whatwg-http-url"'
              };
              e === null ? e = [r] : e.push(r), t++;
            }
          } else {
            const r = {
              instancePath: s + "/blueprintMeta/donateLink",
              schemaPath: "#/definitions/DataSources.URLReference/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        }
        if (m.tags !== void 0) {
          let p = m.tags;
          if (Array.isArray(p)) {
            const r = p.length;
            for (let o = 0; o < r; o++)
              if (typeof p[o] != "string") {
                const P = {
                  instancePath: s + "/blueprintMeta/tags/" + o,
                  schemaPath: "#/properties/blueprintMeta/properties/tags/items/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [P] : e.push(P), t++;
              }
          } else {
            const r = {
              instancePath: s + "/blueprintMeta/tags",
              schemaPath: "#/properties/blueprintMeta/properties/tags/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        }
        if (m.license !== void 0 && typeof m.license != "string") {
          const p = {
            instancePath: s + "/blueprintMeta/license",
            schemaPath: "#/properties/blueprintMeta/properties/license/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
      } else {
        const p = {
          instancePath: s + "/blueprintMeta",
          schemaPath: "#/properties/blueprintMeta/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.applicationOptions !== void 0) {
      let m = h.applicationOptions;
      if (m && typeof m == "object" && !Array.isArray(m)) {
        if (m["wordpress-playground"] === void 0) {
          const p = {
            instancePath: s + "/applicationOptions",
            schemaPath: "#/properties/applicationOptions/required",
            keyword: "required",
            params: { missingProperty: "wordpress-playground" },
            message: "must have required property 'wordpress-playground'"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        for (const p in m)
          if (p !== "wordpress-playground") {
            const r = {
              instancePath: s + "/applicationOptions",
              schemaPath: "#/properties/applicationOptions/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: p },
              message: "must NOT have additional properties"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        if (m["wordpress-playground"] !== void 0) {
          let p = m["wordpress-playground"];
          if (p && typeof p == "object" && !Array.isArray(p)) {
            for (const r in p)
              if (!(r === "landingPage" || r === "login" || r === "networkAccess" || r === "loadPhpExtensions")) {
                const o = {
                  instancePath: s + "/applicationOptions/wordpress-playground",
                  schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: r },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [o] : e.push(o), t++;
              }
            if (p.landingPage !== void 0 && typeof p.landingPage != "string") {
              const r = {
                instancePath: s + "/applicationOptions/wordpress-playground/landingPage",
                schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/landingPage/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [r] : e.push(r), t++;
            }
            if (p.login !== void 0) {
              let r = p.login;
              const o = t;
              let P = !1;
              const i = t;
              if (typeof r != "boolean") {
                const a = {
                  instancePath: s + "/applicationOptions/wordpress-playground/login",
                  schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/0/type",
                  keyword: "type",
                  params: { type: "boolean" },
                  message: "must be boolean"
                };
                e === null ? e = [a] : e.push(a), t++;
              }
              var z = i === t;
              if (P = P || z, !P) {
                const a = t;
                if (r && typeof r == "object" && !Array.isArray(r)) {
                  if (r.username === void 0) {
                    const f = {
                      instancePath: s + "/applicationOptions/wordpress-playground/login",
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/required",
                      keyword: "required",
                      params: {
                        missingProperty: "username"
                      },
                      message: "must have required property 'username'"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
                  if (r.password === void 0) {
                    const f = {
                      instancePath: s + "/applicationOptions/wordpress-playground/login",
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/required",
                      keyword: "required",
                      params: {
                        missingProperty: "password"
                      },
                      message: "must have required property 'password'"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
                  for (const f in r)
                    if (!(f === "username" || f === "password")) {
                      const _ = {
                        instancePath: s + "/applicationOptions/wordpress-playground/login",
                        schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: f
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [_] : e.push(_), t++;
                    }
                  if (r.username !== void 0 && typeof r.username != "string") {
                    const f = {
                      instancePath: s + "/applicationOptions/wordpress-playground/login/username",
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/properties/username/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
                  if (r.password !== void 0 && typeof r.password != "string") {
                    const f = {
                      instancePath: s + "/applicationOptions/wordpress-playground/login/password",
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/properties/password/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
                } else {
                  const f = {
                    instancePath: s + "/applicationOptions/wordpress-playground/login",
                    schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf/1/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [f] : e.push(f), t++;
                }
                var z = a === t;
                P = P || z;
              }
              if (P)
                t = o, e !== null && (o ? e.length = o : e = null);
              else {
                const a = {
                  instancePath: s + "/applicationOptions/wordpress-playground/login",
                  schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/login/anyOf",
                  keyword: "anyOf",
                  params: {},
                  message: "must match a schema in anyOf"
                };
                e === null ? e = [a] : e.push(a), t++;
              }
            }
            if (p.networkAccess !== void 0 && typeof p.networkAccess != "boolean") {
              const r = {
                instancePath: s + "/applicationOptions/wordpress-playground/networkAccess",
                schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/networkAccess/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [r] : e.push(r), t++;
            }
            if (p.loadPhpExtensions !== void 0) {
              let r = p.loadPhpExtensions;
              if (Array.isArray(r)) {
                const o = r.length;
                for (let P = 0; P < o; P++) {
                  let i = r[P];
                  if (typeof i != "string") {
                    const a = {
                      instancePath: s + "/applicationOptions/wordpress-playground/loadPhpExtensions/" + P,
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/loadPhpExtensions/items/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [a] : e.push(a), t++;
                  }
                  if (i !== "intl") {
                    const a = {
                      instancePath: s + "/applicationOptions/wordpress-playground/loadPhpExtensions/" + P,
                      schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/loadPhpExtensions/items/const",
                      keyword: "const",
                      params: { allowedValue: "intl" },
                      message: "must be equal to constant"
                    };
                    e === null ? e = [a] : e.push(a), t++;
                  }
                }
              } else {
                const o = {
                  instancePath: s + "/applicationOptions/wordpress-playground/loadPhpExtensions",
                  schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/properties/loadPhpExtensions/type",
                  keyword: "type",
                  params: { type: "array" },
                  message: "must be array"
                };
                e === null ? e = [o] : e.push(o), t++;
              }
            }
          } else {
            const r = {
              instancePath: s + "/applicationOptions/wordpress-playground",
              schemaPath: "#/properties/applicationOptions/properties/wordpress-playground/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [r] : e.push(r), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/applicationOptions",
          schemaPath: "#/properties/applicationOptions/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.contentBaseline !== void 0) {
      let m = h.contentBaseline;
      const p = t;
      let r = !1;
      const o = t;
      if (typeof m != "string") {
        const P = {
          instancePath: s + "/contentBaseline",
          schemaPath: "#/properties/contentBaseline/anyOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
      if (m !== "keep-all") {
        const P = {
          instancePath: s + "/contentBaseline",
          schemaPath: "#/properties/contentBaseline/anyOf/0/const",
          keyword: "const",
          params: { allowedValue: "keep-all" },
          message: "must be equal to constant"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
      var K = o === t;
      if (r = r || K, !r) {
        const P = t;
        if (typeof m != "string") {
          const a = {
            instancePath: s + "/contentBaseline",
            schemaPath: "#/properties/contentBaseline/anyOf/1/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [a] : e.push(a), t++;
        }
        if (m !== "empty") {
          const a = {
            instancePath: s + "/contentBaseline",
            schemaPath: "#/properties/contentBaseline/anyOf/1/const",
            keyword: "const",
            params: { allowedValue: "empty" },
            message: "must be equal to constant"
          };
          e === null ? e = [a] : e.push(a), t++;
        }
        var K = P === t;
        if (r = r || K, !r) {
          const a = t;
          if (typeof m != "string") {
            const f = {
              instancePath: s + "/contentBaseline",
              schemaPath: "#/properties/contentBaseline/anyOf/2/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [f] : e.push(f), t++;
          }
          if (!(m === "posts" || m === "pages")) {
            const f = {
              instancePath: s + "/contentBaseline",
              schemaPath: "#/properties/contentBaseline/anyOf/2/enum",
              keyword: "enum",
              params: {
                allowedValues: M.properties.contentBaseline.anyOf[2].enum
              },
              message: "must be equal to one of the allowed values"
            };
            e === null ? e = [f] : e.push(f), t++;
          }
          var K = a === t;
          if (r = r || K, !r) {
            const f = t, _ = t;
            let c = !0;
            const l = t;
            if (Array.isArray(m)) {
              const g = t, y = m.length;
              for (let b = 0; b < y; b++) {
                const O = t;
                if (m[b] !== "comments") {
                  const d = {};
                  e === null ? e = [d] : e.push(d), t++;
                }
                var oe = O === t;
                if (oe)
                  break;
              }
              if (oe)
                t = g, e !== null && (g ? e.length = g : e = null);
              else {
                const b = {};
                e === null ? e = [b] : e.push(b), t++;
              }
            }
            var Ve = l === t;
            if (t = _, e !== null && (_ ? e.length = _ : e = null), Ve) {
              const g = t;
              if (Array.isArray(m)) {
                const b = t, O = m.length;
                for (let d = 0; d < O; d++) {
                  const A = t;
                  if (m[d] !== "posts") {
                    const k = {
                      instancePath: s + "/contentBaseline/" + d,
                      schemaPath: "#/properties/contentBaseline/anyOf/3/allOf/0/then/allOf/0/contains/const",
                      keyword: "const",
                      params: { allowedValue: "posts" },
                      message: "must be equal to constant"
                    };
                    e === null ? e = [k] : e.push(k), t++;
                  }
                  var mt = A === t;
                  if (mt)
                    break;
                }
                if (mt)
                  t = b, e !== null && (b ? e.length = b : e = null);
                else {
                  const d = {
                    instancePath: s + "/contentBaseline",
                    schemaPath: "#/properties/contentBaseline/anyOf/3/allOf/0/then/allOf/0/contains",
                    keyword: "contains",
                    params: { minContains: 1 },
                    message: "must contain at least 1 valid item(s)"
                  };
                  e === null ? e = [d] : e.push(d), t++;
                }
              }
              if (Array.isArray(m)) {
                const b = t, O = m.length;
                for (let d = 0; d < O; d++) {
                  const A = t;
                  if (m[d] !== "pages") {
                    const k = {
                      instancePath: s + "/contentBaseline/" + d,
                      schemaPath: "#/properties/contentBaseline/anyOf/3/allOf/0/then/allOf/1/contains/const",
                      keyword: "const",
                      params: { allowedValue: "pages" },
                      message: "must be equal to constant"
                    };
                    e === null ? e = [k] : e.push(k), t++;
                  }
                  var dt = A === t;
                  if (dt)
                    break;
                }
                if (dt)
                  t = b, e !== null && (b ? e.length = b : e = null);
                else {
                  const d = {
                    instancePath: s + "/contentBaseline",
                    schemaPath: "#/properties/contentBaseline/anyOf/3/allOf/0/then/allOf/1/contains",
                    keyword: "contains",
                    params: { minContains: 1 },
                    message: "must contain at least 1 valid item(s)"
                  };
                  e === null ? e = [d] : e.push(d), t++;
                }
              }
              var Ve = g === t;
              c = Ve;
            }
            if (!c) {
              const g = {
                instancePath: s + "/contentBaseline",
                schemaPath: "#/properties/contentBaseline/anyOf/3/allOf/0/if",
                keyword: "if",
                params: { failingKeyword: "then" },
                message: 'must match "then" schema'
              };
              e === null ? e = [g] : e.push(g), t++;
            }
            if (Array.isArray(m)) {
              if (m.length < 1) {
                const O = {
                  instancePath: s + "/contentBaseline",
                  schemaPath: "#/properties/contentBaseline/anyOf/3/minItems",
                  keyword: "minItems",
                  params: { limit: 1 },
                  message: "must NOT have fewer than 1 items"
                };
                e === null ? e = [O] : e.push(O), t++;
              }
              const g = m.length;
              for (let O = 0; O < g; O++) {
                let d = m[O];
                if (typeof d != "string") {
                  const A = {
                    instancePath: s + "/contentBaseline/" + O,
                    schemaPath: "#/properties/contentBaseline/anyOf/3/items/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [A] : e.push(A), t++;
                }
                if (!(d === "posts" || d === "pages" || d === "comments")) {
                  const A = {
                    instancePath: s + "/contentBaseline/" + O,
                    schemaPath: "#/properties/contentBaseline/anyOf/3/items/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: M.properties.contentBaseline.anyOf[3].items.enum
                    },
                    message: "must be equal to one of the allowed values"
                  };
                  e === null ? e = [A] : e.push(A), t++;
                }
              }
              let y = m.length, b;
              if (y > 1) {
                const O = {};
                for (; y--; ) {
                  let d = m[y];
                  if (typeof d == "string") {
                    if (typeof O[d] == "number") {
                      b = O[d];
                      const A = {
                        instancePath: s + "/contentBaseline",
                        schemaPath: "#/properties/contentBaseline/anyOf/3/uniqueItems",
                        keyword: "uniqueItems",
                        params: { i: y, j: b },
                        message: "must NOT have duplicate items (items ## " + b + " and " + y + " are identical)"
                      };
                      e === null ? e = [A] : e.push(A), t++;
                      break;
                    }
                    O[d] = y;
                  }
                }
              }
            } else {
              const g = {
                instancePath: s + "/contentBaseline",
                schemaPath: "#/properties/contentBaseline/anyOf/3/type",
                keyword: "type",
                params: { type: "array" },
                message: "must be array"
              };
              e === null ? e = [g] : e.push(g), t++;
            }
            var K = f === t;
            r = r || K;
          }
        }
      }
      if (r)
        t = p, e !== null && (p ? e.length = p : e = null);
      else {
        const P = {
          instancePath: s + "/contentBaseline",
          schemaPath: "#/properties/contentBaseline/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
    }
    if (h.usersBaseline !== void 0) {
      let m = h.usersBaseline;
      if (typeof m != "string") {
        const p = {
          instancePath: s + "/usersBaseline",
          schemaPath: "#/properties/usersBaseline/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
      if (!(m === "keep-all" || m === "empty")) {
        const p = {
          instancePath: s + "/usersBaseline",
          schemaPath: "#/properties/usersBaseline/enum",
          keyword: "enum",
          params: {
            allowedValues: M.properties.usersBaseline.enum
          },
          message: "must be equal to one of the allowed values"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.siteLanguage !== void 0 && typeof h.siteLanguage != "string") {
      const m = {
        instancePath: s + "/siteLanguage",
        schemaPath: "#/properties/siteLanguage/type",
        keyword: "type",
        params: { type: "string" },
        message: "must be string"
      };
      e === null ? e = [m] : e.push(m), t++;
    }
    if (h.siteOptions !== void 0) {
      let m = h.siteOptions;
      if (m && typeof m == "object" && !Array.isArray(m)) {
        for (const p in m)
          if (!(p === "blogname" || p === "timezone_string" || p === "permalink_structure" || p === "siteUrl")) {
            let r = m[p];
            if ((!r || typeof r != "object") && typeof r != "string" && typeof r != "boolean" && !(typeof r == "number" && isFinite(r))) {
              const o = {
                instancePath: s + "/siteOptions/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/properties/siteOptions/additionalProperties/type",
                keyword: "type",
                params: {
                  type: M.properties.siteOptions.additionalProperties.type
                },
                message: "must be string,boolean,number,array,object"
              };
              e === null ? e = [o] : e.push(o), t++;
            }
          }
        if (m.blogname !== void 0 && typeof m.blogname != "string") {
          const p = {
            instancePath: s + "/siteOptions/blogname",
            schemaPath: "#/properties/siteOptions/properties/blogname/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.timezone_string !== void 0 && typeof m.timezone_string != "string") {
          const p = {
            instancePath: s + "/siteOptions/timezone_string",
            schemaPath: "#/properties/siteOptions/properties/timezone_string/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.permalink_structure !== void 0) {
          let p = m.permalink_structure;
          const r = t;
          let o = !1;
          const P = t;
          if (typeof p != "string") {
            const i = {
              instancePath: s + "/siteOptions/permalink_structure",
              schemaPath: "#/properties/siteOptions/properties/permalink_structure/anyOf/0/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string"
            };
            e === null ? e = [i] : e.push(i), t++;
          }
          var Ce = P === t;
          if (o = o || Ce, !o) {
            const i = t;
            if (typeof p != "boolean") {
              const n = {
                instancePath: s + "/siteOptions/permalink_structure",
                schemaPath: "#/properties/siteOptions/properties/permalink_structure/anyOf/1/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
            if (p !== !1) {
              const n = {
                instancePath: s + "/siteOptions/permalink_structure",
                schemaPath: "#/properties/siteOptions/properties/permalink_structure/anyOf/1/const",
                keyword: "const",
                params: { allowedValue: !1 },
                message: "must be equal to constant"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
            var Ce = i === t;
            o = o || Ce;
          }
          if (o)
            t = r, e !== null && (r ? e.length = r : e = null);
          else {
            const i = {
              instancePath: s + "/siteOptions/permalink_structure",
              schemaPath: "#/properties/siteOptions/properties/permalink_structure/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [i] : e.push(i), t++;
          }
        }
        if (m.siteUrl !== void 0) {
          const p = {
            instancePath: s + "/siteOptions/siteUrl",
            schemaPath: "#/properties/siteOptions/properties/siteUrl/false schema",
            keyword: "false schema",
            params: {},
            message: "boolean schema is false"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
      } else {
        const p = {
          instancePath: s + "/siteOptions",
          schemaPath: "#/properties/siteOptions/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.constants !== void 0) {
      let m = h.constants;
      if (m && typeof m == "object" && !Array.isArray(m)) {
        for (const p in m)
          if (!(p === "WP_DEBUG" || p === "WP_DEBUG_LOG" || p === "WP_DEBUG_DISPLAY" || p === "SCRIPT_DEBUG")) {
            let r = m[p];
            if (typeof r != "boolean" && typeof r != "string" && !(typeof r == "number" && isFinite(r))) {
              const o = {
                instancePath: s + "/constants/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/properties/constants/additionalProperties/type",
                keyword: "type",
                params: {
                  type: M.properties.constants.additionalProperties.type
                },
                message: "must be boolean,string,number"
              };
              e === null ? e = [o] : e.push(o), t++;
            }
          }
        if (m.WP_DEBUG !== void 0 && typeof m.WP_DEBUG != "boolean") {
          const p = {
            instancePath: s + "/constants/WP_DEBUG",
            schemaPath: "#/properties/constants/properties/WP_DEBUG/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.WP_DEBUG_LOG !== void 0 && typeof m.WP_DEBUG_LOG != "boolean") {
          const p = {
            instancePath: s + "/constants/WP_DEBUG_LOG",
            schemaPath: "#/properties/constants/properties/WP_DEBUG_LOG/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.WP_DEBUG_DISPLAY !== void 0 && typeof m.WP_DEBUG_DISPLAY != "boolean") {
          const p = {
            instancePath: s + "/constants/WP_DEBUG_DISPLAY",
            schemaPath: "#/properties/constants/properties/WP_DEBUG_DISPLAY/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
        if (m.SCRIPT_DEBUG !== void 0 && typeof m.SCRIPT_DEBUG != "boolean") {
          const p = {
            instancePath: s + "/constants/SCRIPT_DEBUG",
            schemaPath: "#/properties/constants/properties/SCRIPT_DEBUG/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean"
          };
          e === null ? e = [p] : e.push(p), t++;
        }
      } else {
        const p = {
          instancePath: s + "/constants",
          schemaPath: "#/properties/constants/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.wordpressVersion !== void 0) {
      let m = h.wordpressVersion;
      const p = t;
      let r = !1;
      const o = t;
      if (typeof m == "string") {
        if (!vt.test(m)) {
          const P = {
            instancePath: s + "/wordpressVersion",
            schemaPath: "#/definitions/DataSources.WordPressVersion/pattern",
            keyword: "pattern",
            params: {
              pattern: "^(?:latest|beta|trunk|nightly|none|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$"
            },
            message: 'must match pattern "^(?:latest|beta|trunk|nightly|none|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$"'
          };
          e === null ? e = [P] : e.push(P), t++;
        }
      } else {
        const P = {
          instancePath: s + "/wordpressVersion",
          schemaPath: "#/definitions/DataSources.WordPressVersion/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
      var Ae = o === t;
      if (r = r || Ae, !r) {
        const P = t;
        W(m, {
          instancePath: s + "/wordpressVersion",
          parentData: h,
          parentDataProperty: "wordpressVersion",
          rootData: D
        }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
        var Ae = P === t;
        if (r = r || Ae, !r) {
          const a = t;
          if (m && typeof m == "object" && !Array.isArray(m)) {
            if (m.min === void 0) {
              const f = {
                instancePath: s + "/wordpressVersion",
                schemaPath: "#/properties/wordpressVersion/anyOf/2/required",
                keyword: "required",
                params: { missingProperty: "min" },
                message: "must have required property 'min'"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            for (const f in m)
              if (!(f === "min" || f === "max" || f === "preferred")) {
                const _ = {
                  instancePath: s + "/wordpressVersion",
                  schemaPath: "#/properties/wordpressVersion/anyOf/2/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: f },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            if (m.min !== void 0) {
              let f = m.min;
              if (typeof f == "string") {
                if (!yt.test(f)) {
                  const _ = {
                    instancePath: s + "/wordpressVersion/min",
                    schemaPath: "#/definitions/DataSources.WordPressVersionConstraintVersion/pattern",
                    keyword: "pattern",
                    params: {
                      pattern: "^\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?$"
                    },
                    message: 'must match pattern "^\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?$"'
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              } else {
                const _ = {
                  instancePath: s + "/wordpressVersion/min",
                  schemaPath: "#/definitions/DataSources.WordPressVersionConstraintVersion/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
            if (m.max !== void 0) {
              let f = m.max;
              if (typeof f == "string") {
                if (!yt.test(f)) {
                  const _ = {
                    instancePath: s + "/wordpressVersion/max",
                    schemaPath: "#/definitions/DataSources.WordPressVersionConstraintVersion/pattern",
                    keyword: "pattern",
                    params: {
                      pattern: "^\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?$"
                    },
                    message: 'must match pattern "^\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?$"'
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              } else {
                const _ = {
                  instancePath: s + "/wordpressVersion/max",
                  schemaPath: "#/definitions/DataSources.WordPressVersionConstraintVersion/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
            if (m.preferred !== void 0) {
              let f = m.preferred;
              if (typeof f == "string") {
                if (!St.test(f)) {
                  const _ = {
                    instancePath: s + "/wordpressVersion/preferred",
                    schemaPath: "#/definitions/DataSources.WordPressVersionPreferredVersion/pattern",
                    keyword: "pattern",
                    params: {
                      pattern: "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$"
                    },
                    message: 'must match pattern "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?(?:-(?:beta\\d+|[Rr][Cc]\\d+))?)$"'
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              } else {
                const _ = {
                  instancePath: s + "/wordpressVersion/preferred",
                  schemaPath: "#/definitions/DataSources.WordPressVersionPreferredVersion/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
          } else {
            const f = {
              instancePath: s + "/wordpressVersion",
              schemaPath: "#/properties/wordpressVersion/anyOf/2/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [f] : e.push(f), t++;
          }
          var Ae = a === t;
          r = r || Ae;
        }
      }
      if (r)
        t = p, e !== null && (p ? e.length = p : e = null);
      else {
        const P = {
          instancePath: s + "/wordpressVersion",
          schemaPath: "#/properties/wordpressVersion/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
    }
    if (h.phpVersion !== void 0) {
      let m = h.phpVersion;
      const p = t;
      let r = !1;
      const o = t;
      if (typeof m == "string") {
        if (!xt.test(m)) {
          const P = {
            instancePath: s + "/phpVersion",
            schemaPath: "#/definitions/DataSources.PHPVersion/pattern",
            keyword: "pattern",
            params: {
              pattern: "^(?:latest|next|\\d+\\.\\d+(?:\\.\\d+)?)$"
            },
            message: 'must match pattern "^(?:latest|next|\\d+\\.\\d+(?:\\.\\d+)?)$"'
          };
          e === null ? e = [P] : e.push(P), t++;
        }
      } else {
        const P = {
          instancePath: s + "/phpVersion",
          schemaPath: "#/definitions/DataSources.PHPVersion/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
      var Le = o === t;
      if (r = r || Le, !r) {
        const P = t;
        if (m && typeof m == "object" && !Array.isArray(m)) {
          for (const a in m)
            if (!(a === "min" || a === "recommended" || a === "max")) {
              const n = {
                instancePath: s + "/phpVersion",
                schemaPath: "#/properties/phpVersion/anyOf/1/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: a },
                message: "must NOT have additional properties"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
          if (m.min !== void 0) {
            let a = m.min;
            if (typeof a == "string") {
              if (!lt.test(a)) {
                const n = {
                  instancePath: s + "/phpVersion/min",
                  schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"
                  },
                  message: 'must match pattern "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"'
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            } else {
              const n = {
                instancePath: s + "/phpVersion/min",
                schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
          }
          if (m.recommended !== void 0) {
            let a = m.recommended;
            if (typeof a == "string") {
              if (!lt.test(a)) {
                const n = {
                  instancePath: s + "/phpVersion/recommended",
                  schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"
                  },
                  message: 'must match pattern "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"'
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            } else {
              const n = {
                instancePath: s + "/phpVersion/recommended",
                schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
          }
          if (m.max !== void 0) {
            let a = m.max;
            if (typeof a == "string") {
              if (!lt.test(a)) {
                const n = {
                  instancePath: s + "/phpVersion/max",
                  schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"
                  },
                  message: 'must match pattern "^(?:latest|\\d+\\.\\d+(?:\\.\\d+)?)$"'
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            } else {
              const n = {
                instancePath: s + "/phpVersion/max",
                schemaPath: "#/definitions/DataSources.PHPVersionConstraintVersion/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [n] : e.push(n), t++;
            }
          }
        } else {
          const a = {
            instancePath: s + "/phpVersion",
            schemaPath: "#/properties/phpVersion/anyOf/1/type",
            keyword: "type",
            params: { type: "object" },
            message: "must be object"
          };
          e === null ? e = [a] : e.push(a), t++;
        }
        var Le = P === t;
        r = r || Le;
      }
      if (r)
        t = p, e !== null && (p ? e.length = p : e = null);
      else {
        const P = {
          instancePath: s + "/phpVersion",
          schemaPath: "#/properties/phpVersion/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
    }
    if (h.activeTheme !== void 0) {
      let m = h.activeTheme;
      const p = t;
      let r = !1;
      const o = t;
      ee(m, {
        instancePath: s + "/activeTheme",
        parentData: h,
        parentDataProperty: "activeTheme",
        rootData: D
      }) || (e = e === null ? ee.errors : e.concat(ee.errors), t = e.length);
      var ke = o === t;
      if (r = r || ke, !r) {
        const P = t;
        W(m, {
          instancePath: s + "/activeTheme",
          parentData: h,
          parentDataProperty: "activeTheme",
          rootData: D
        }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
        var ke = P === t;
        if (r = r || ke, !r) {
          const a = t;
          if (m && typeof m == "object" && !Array.isArray(m)) {
            if (m.source === void 0) {
              const f = {
                instancePath: s + "/activeTheme",
                schemaPath: "#/properties/activeTheme/anyOf/2/required",
                keyword: "required",
                params: { missingProperty: "source" },
                message: "must have required property 'source'"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            for (const f in m)
              if (!(f === "source" || f === "importStarterContent" || f === "targetDirectoryName" || f === "onError" || f === "ifAlreadyInstalled" || f === "humanReadableName")) {
                const _ = {
                  instancePath: s + "/activeTheme",
                  schemaPath: "#/properties/activeTheme/anyOf/2/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: f },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            if (m.source !== void 0) {
              let f = m.source;
              const _ = t;
              let c = !1;
              const l = t;
              ee(f, {
                instancePath: s + "/activeTheme/source",
                parentData: m,
                parentDataProperty: "source",
                rootData: D
              }) || (e = e === null ? ee.errors : e.concat(ee.errors), t = e.length);
              var Be = l === t;
              if (c = c || Be, !c) {
                const u = t;
                W(f, {
                  instancePath: s + "/activeTheme/source",
                  parentData: m,
                  parentDataProperty: "source",
                  rootData: D
                }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
                var Be = u === t;
                c = c || Be;
              }
              if (c)
                t = _, e !== null && (_ ? e.length = _ : e = null);
              else {
                const u = {
                  instancePath: s + "/activeTheme/source",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/source/anyOf",
                  keyword: "anyOf",
                  params: {},
                  message: "must match a schema in anyOf"
                };
                e === null ? e = [u] : e.push(u), t++;
              }
            }
            if (m.importStarterContent !== void 0 && typeof m.importStarterContent != "boolean") {
              const f = {
                instancePath: s + "/activeTheme/importStarterContent",
                schemaPath: "#/properties/activeTheme/anyOf/2/properties/importStarterContent/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            if (m.targetDirectoryName !== void 0) {
              let f = m.targetDirectoryName;
              if (typeof f == "string") {
                if (!ae.test(f)) {
                  const _ = {
                    instancePath: s + "/activeTheme/targetDirectoryName",
                    schemaPath: "#/properties/activeTheme/anyOf/2/properties/targetDirectoryName/pattern",
                    keyword: "pattern",
                    params: {
                      pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                    },
                    message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              } else {
                const _ = {
                  instancePath: s + "/activeTheme/targetDirectoryName",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/targetDirectoryName/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
            if (m.onError !== void 0) {
              let f = m.onError;
              if (typeof f != "string") {
                const _ = {
                  instancePath: s + "/activeTheme/onError",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/onError/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              if (!(f === "skip-theme" || f === "throw")) {
                const _ = {
                  instancePath: s + "/activeTheme/onError",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/onError/enum",
                  keyword: "enum",
                  params: {
                    allowedValues: M.properties.activeTheme.anyOf[2].properties.onError.enum
                  },
                  message: "must be equal to one of the allowed values"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
            if (m.ifAlreadyInstalled !== void 0) {
              let f = m.ifAlreadyInstalled;
              if (typeof f != "string") {
                const _ = {
                  instancePath: s + "/activeTheme/ifAlreadyInstalled",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/ifAlreadyInstalled/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              if (!(f === "overwrite" || f === "skip" || f === "error")) {
                const _ = {
                  instancePath: s + "/activeTheme/ifAlreadyInstalled",
                  schemaPath: "#/properties/activeTheme/anyOf/2/properties/ifAlreadyInstalled/enum",
                  keyword: "enum",
                  params: {
                    allowedValues: M.properties.activeTheme.anyOf[2].properties.ifAlreadyInstalled.enum
                  },
                  message: "must be equal to one of the allowed values"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            }
            if (m.humanReadableName !== void 0 && typeof m.humanReadableName != "string") {
              const f = {
                instancePath: s + "/activeTheme/humanReadableName",
                schemaPath: "#/properties/activeTheme/anyOf/2/properties/humanReadableName/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
          } else {
            const f = {
              instancePath: s + "/activeTheme",
              schemaPath: "#/properties/activeTheme/anyOf/2/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [f] : e.push(f), t++;
          }
          var ke = a === t;
          r = r || ke;
        }
      }
      if (r)
        t = p, e !== null && (p ? e.length = p : e = null);
      else {
        const P = {
          instancePath: s + "/activeTheme",
          schemaPath: "#/properties/activeTheme/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf"
        };
        e === null ? e = [P] : e.push(P), t++;
      }
    }
    if (h.themes !== void 0) {
      let m = h.themes;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          const P = t;
          let i = !1;
          const a = t;
          ee(o, {
            instancePath: s + "/themes/" + r,
            parentData: m,
            parentDataProperty: r,
            rootData: D
          }) || (e = e === null ? ee.errors : e.concat(ee.errors), t = e.length);
          var ve = a === t;
          if (i = i || ve, !i) {
            const n = t;
            W(o, {
              instancePath: s + "/themes/" + r,
              parentData: m,
              parentDataProperty: r,
              rootData: D
            }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
            var ve = n === t;
            if (i = i || ve, !i) {
              const _ = t;
              if (o && typeof o == "object" && !Array.isArray(o)) {
                if (o.source === void 0) {
                  const l = {
                    instancePath: s + "/themes/" + r,
                    schemaPath: "#/properties/themes/items/anyOf/2/required",
                    keyword: "required",
                    params: { missingProperty: "source" },
                    message: "must have required property 'source'"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
                for (const l in o)
                  if (!(l === "source" || l === "importStarterContent" || l === "targetDirectoryName" || l === "onError" || l === "ifAlreadyInstalled" || l === "humanReadableName")) {
                    const u = {
                      instancePath: s + "/themes/" + r,
                      schemaPath: "#/properties/themes/items/anyOf/2/additionalProperties",
                      keyword: "additionalProperties",
                      params: {
                        additionalProperty: l
                      },
                      message: "must NOT have additional properties"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                if (o.source !== void 0) {
                  let l = o.source;
                  const u = t;
                  let g = !1;
                  const y = t;
                  ee(l, {
                    instancePath: s + "/themes/" + r + "/source",
                    parentData: o,
                    parentDataProperty: "source",
                    rootData: D
                  }) || (e = e === null ? ee.errors : e.concat(
                    ee.errors
                  ), t = e.length);
                  var We = y === t;
                  if (g = g || We, !g) {
                    const b = t;
                    W(l, {
                      instancePath: s + "/themes/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? W.errors : e.concat(
                      W.errors
                    ), t = e.length);
                    var We = b === t;
                    g = g || We;
                  }
                  if (g)
                    t = u, e !== null && (u ? e.length = u : e = null);
                  else {
                    const b = {
                      instancePath: s + "/themes/" + r + "/source",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/source/anyOf",
                      keyword: "anyOf",
                      params: {},
                      message: "must match a schema in anyOf"
                    };
                    e === null ? e = [b] : e.push(b), t++;
                  }
                }
                if (o.importStarterContent !== void 0 && typeof o.importStarterContent != "boolean") {
                  const l = {
                    instancePath: s + "/themes/" + r + "/importStarterContent",
                    schemaPath: "#/properties/themes/items/anyOf/2/properties/importStarterContent/type",
                    keyword: "type",
                    params: { type: "boolean" },
                    message: "must be boolean"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
                if (o.targetDirectoryName !== void 0) {
                  let l = o.targetDirectoryName;
                  if (typeof l == "string") {
                    if (!ae.test(l)) {
                      const u = {
                        instancePath: s + "/themes/" + r + "/targetDirectoryName",
                        schemaPath: "#/properties/themes/items/anyOf/2/properties/targetDirectoryName/pattern",
                        keyword: "pattern",
                        params: {
                          pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                        },
                        message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                      };
                      e === null ? e = [u] : e.push(u), t++;
                    }
                  } else {
                    const u = {
                      instancePath: s + "/themes/" + r + "/targetDirectoryName",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/targetDirectoryName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.onError !== void 0) {
                  let l = o.onError;
                  if (typeof l != "string") {
                    const u = {
                      instancePath: s + "/themes/" + r + "/onError",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/onError/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (!(l === "skip-theme" || l === "throw")) {
                    const u = {
                      instancePath: s + "/themes/" + r + "/onError",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/onError/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: M.properties.themes.items.anyOf[2].properties.onError.enum
                      },
                      message: "must be equal to one of the allowed values"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.ifAlreadyInstalled !== void 0) {
                  let l = o.ifAlreadyInstalled;
                  if (typeof l != "string") {
                    const u = {
                      instancePath: s + "/themes/" + r + "/ifAlreadyInstalled",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/ifAlreadyInstalled/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (!(l === "overwrite" || l === "skip" || l === "error")) {
                    const u = {
                      instancePath: s + "/themes/" + r + "/ifAlreadyInstalled",
                      schemaPath: "#/properties/themes/items/anyOf/2/properties/ifAlreadyInstalled/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: M.properties.themes.items.anyOf[2].properties.ifAlreadyInstalled.enum
                      },
                      message: "must be equal to one of the allowed values"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                  const l = {
                    instancePath: s + "/themes/" + r + "/humanReadableName",
                    schemaPath: "#/properties/themes/items/anyOf/2/properties/humanReadableName/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
              } else {
                const l = {
                  instancePath: s + "/themes/" + r,
                  schemaPath: "#/properties/themes/items/anyOf/2/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [l] : e.push(l), t++;
              }
              var ve = _ === t;
              i = i || ve;
            }
          }
          if (i)
            t = P, e !== null && (P ? e.length = P : e = null);
          else {
            const n = {
              instancePath: s + "/themes/" + r,
              schemaPath: "#/properties/themes/items/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [n] : e.push(n), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/themes",
          schemaPath: "#/properties/themes/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.plugins !== void 0) {
      let m = h.plugins;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          const P = t;
          let i = !1;
          const a = t;
          W(o, {
            instancePath: s + "/plugins/" + r,
            parentData: m,
            parentDataProperty: r,
            rootData: D
          }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
          var Se = a === t;
          if (i = i || Se, !i) {
            const n = t;
            ie(o, {
              instancePath: s + "/plugins/" + r,
              parentData: m,
              parentDataProperty: r,
              rootData: D
            }) || (e = e === null ? ie.errors : e.concat(ie.errors), t = e.length);
            var Se = n === t;
            if (i = i || Se, !i) {
              const _ = t;
              if (o && typeof o == "object" && !Array.isArray(o)) {
                if (o.source === void 0) {
                  const l = {
                    instancePath: s + "/plugins/" + r,
                    schemaPath: "#/properties/plugins/items/anyOf/2/required",
                    keyword: "required",
                    params: { missingProperty: "source" },
                    message: "must have required property 'source'"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
                for (const l in o)
                  if (!(l === "source" || l === "active" || l === "activationOptions" || l === "targetDirectoryName" || l === "onError" || l === "ifAlreadyInstalled" || l === "humanReadableName")) {
                    const u = {
                      instancePath: s + "/plugins/" + r,
                      schemaPath: "#/properties/plugins/items/anyOf/2/additionalProperties",
                      keyword: "additionalProperties",
                      params: {
                        additionalProperty: l
                      },
                      message: "must NOT have additional properties"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                if (o.source !== void 0) {
                  let l = o.source;
                  const u = t;
                  let g = !1;
                  const y = t;
                  W(l, {
                    instancePath: s + "/plugins/" + r + "/source",
                    parentData: o,
                    parentDataProperty: "source",
                    rootData: D
                  }) || (e = e === null ? W.errors : e.concat(
                    W.errors
                  ), t = e.length);
                  var Ge = y === t;
                  if (g = g || Ge, !g) {
                    const b = t;
                    ie(l, {
                      instancePath: s + "/plugins/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? ie.errors : e.concat(
                      ie.errors
                    ), t = e.length);
                    var Ge = b === t;
                    g = g || Ge;
                  }
                  if (g)
                    t = u, e !== null && (u ? e.length = u : e = null);
                  else {
                    const b = {
                      instancePath: s + "/plugins/" + r + "/source",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/source/anyOf",
                      keyword: "anyOf",
                      params: {},
                      message: "must match a schema in anyOf"
                    };
                    e === null ? e = [b] : e.push(b), t++;
                  }
                }
                if (o.active !== void 0 && typeof o.active != "boolean") {
                  const l = {
                    instancePath: s + "/plugins/" + r + "/active",
                    schemaPath: "#/properties/plugins/items/anyOf/2/properties/active/type",
                    keyword: "type",
                    params: { type: "boolean" },
                    message: "must be boolean"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
                if (o.activationOptions !== void 0) {
                  let l = o.activationOptions;
                  if (l && typeof l == "object" && !Array.isArray(l))
                    for (const u in l) {
                      let g = l[u];
                      const y = t;
                      let b = !1;
                      const O = t;
                      if (typeof g != "string") {
                        const d = {
                          instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(/~/g, "~0").replace(
                            /\//g,
                            "~1"
                          ),
                          schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf/0/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string"
                        };
                        e === null ? e = [d] : e.push(d), t++;
                      }
                      var ne = O === t;
                      if (b = b || ne, !b) {
                        const d = t;
                        if (typeof g != "boolean") {
                          const k = {
                            instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf/1/type",
                            keyword: "type",
                            params: {
                              type: "boolean"
                            },
                            message: "must be boolean"
                          };
                          e === null ? e = [k] : e.push(k), t++;
                        }
                        var ne = d === t;
                        if (b = b || ne, !b) {
                          const k = t;
                          if (!(typeof g == "number" && isFinite(g))) {
                            const w = {
                              instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf/2/type",
                              keyword: "type",
                              params: {
                                type: "number"
                              },
                              message: "must be number"
                            };
                            e === null ? e = [w] : e.push(
                              w
                            ), t++;
                          }
                          var ne = k === t;
                          if (b = b || ne, !b) {
                            const w = t;
                            if (Array.isArray(
                              g
                            )) {
                              const v = g.length;
                              for (let S = 0; S < v; S++)
                                C(
                                  g[S],
                                  {
                                    instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ) + "/" + S,
                                    parentData: g,
                                    parentDataProperty: S,
                                    rootData: D
                                  }
                                ) || (e = e === null ? C.errors : e.concat(
                                  C.errors
                                ), t = e.length);
                            } else {
                              const v = {
                                instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ),
                                schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf/3/type",
                                keyword: "type",
                                params: {
                                  type: "array"
                                },
                                message: "must be array"
                              };
                              e === null ? e = [
                                v
                              ] : e.push(
                                v
                              ), t++;
                            }
                            var ne = w === t;
                            if (b = b || ne, !b) {
                              const v = t;
                              if (g && typeof g == "object" && !Array.isArray(
                                g
                              ))
                                for (const N in g)
                                  C(
                                    g[N],
                                    {
                                      instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/" + N.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ),
                                      parentData: g,
                                      parentDataProperty: N,
                                      rootData: D
                                    }
                                  ) || (e = e === null ? C.errors : e.concat(
                                    C.errors
                                  ), t = e.length);
                              else {
                                const N = {
                                  instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf/4/type",
                                  keyword: "type",
                                  params: {
                                    type: "object"
                                  },
                                  message: "must be object"
                                };
                                e === null ? e = [
                                  N
                                ] : e.push(
                                  N
                                ), t++;
                              }
                              var ne = v === t;
                              b = b || ne;
                            }
                          }
                        }
                      }
                      if (b)
                        t = y, e !== null && (y ? e.length = y : e = null);
                      else {
                        const d = {
                          instancePath: s + "/plugins/" + r + "/activationOptions/" + u.replace(/~/g, "~0").replace(
                            /\//g,
                            "~1"
                          ),
                          schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/additionalProperties/anyOf",
                          keyword: "anyOf",
                          params: {},
                          message: "must match a schema in anyOf"
                        };
                        e === null ? e = [d] : e.push(d), t++;
                      }
                    }
                  else {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/activationOptions",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/activationOptions/type",
                      keyword: "type",
                      params: { type: "object" },
                      message: "must be object"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.targetDirectoryName !== void 0) {
                  let l = o.targetDirectoryName;
                  if (typeof l == "string") {
                    if (!ae.test(l)) {
                      const u = {
                        instancePath: s + "/plugins/" + r + "/targetDirectoryName",
                        schemaPath: "#/properties/plugins/items/anyOf/2/properties/targetDirectoryName/pattern",
                        keyword: "pattern",
                        params: {
                          pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                        },
                        message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                      };
                      e === null ? e = [u] : e.push(u), t++;
                    }
                  } else {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/targetDirectoryName",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/targetDirectoryName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.onError !== void 0) {
                  let l = o.onError;
                  if (typeof l != "string") {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/onError",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/onError/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (!(l === "skip-plugin" || l === "throw")) {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/onError",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/onError/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: M.properties.plugins.items.anyOf[2].properties.onError.enum
                      },
                      message: "must be equal to one of the allowed values"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.ifAlreadyInstalled !== void 0) {
                  let l = o.ifAlreadyInstalled;
                  if (typeof l != "string") {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/ifAlreadyInstalled",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/ifAlreadyInstalled/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (!(l === "overwrite" || l === "skip" || l === "error")) {
                    const u = {
                      instancePath: s + "/plugins/" + r + "/ifAlreadyInstalled",
                      schemaPath: "#/properties/plugins/items/anyOf/2/properties/ifAlreadyInstalled/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: M.properties.plugins.items.anyOf[2].properties.ifAlreadyInstalled.enum
                      },
                      message: "must be equal to one of the allowed values"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                }
                if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                  const l = {
                    instancePath: s + "/plugins/" + r + "/humanReadableName",
                    schemaPath: "#/properties/plugins/items/anyOf/2/properties/humanReadableName/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [l] : e.push(l), t++;
                }
              } else {
                const l = {
                  instancePath: s + "/plugins/" + r,
                  schemaPath: "#/properties/plugins/items/anyOf/2/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [l] : e.push(l), t++;
              }
              var Se = _ === t;
              i = i || Se;
            }
          }
          if (i)
            t = P, e !== null && (P ? e.length = P : e = null);
          else {
            const n = {
              instancePath: s + "/plugins/" + r,
              schemaPath: "#/properties/plugins/items/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [n] : e.push(n), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/plugins",
          schemaPath: "#/properties/plugins/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.muPlugins !== void 0) {
      let m = h.muPlugins;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++)
          W(m[r], {
            instancePath: s + "/muPlugins/" + r,
            parentData: m,
            parentDataProperty: r,
            rootData: D
          }) || (e = e === null ? W.errors : e.concat(W.errors), t = e.length);
      } else {
        const p = {
          instancePath: s + "/muPlugins",
          schemaPath: "#/properties/muPlugins/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.postTypes !== void 0) {
      let m = h.postTypes;
      if (m && typeof m == "object" && !Array.isArray(m)) {
        for (const p in m) {
          const r = t;
          if (typeof p == "string" && !Et.test(p)) {
            const o = {
              instancePath: s + "/postTypes",
              schemaPath: "#/properties/postTypes/propertyNames/pattern",
              keyword: "pattern",
              params: { pattern: "^[a-z0-9_-]{1,20}$" },
              message: 'must match pattern "^[a-z0-9_-]{1,20}$"',
              propertyName: p
            };
            e === null ? e = [o] : e.push(o), t++;
          }
          var gt = r === t;
          if (!gt) {
            const o = {
              instancePath: s + "/postTypes",
              schemaPath: "#/properties/postTypes/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: p },
              message: "property name must be valid"
            };
            e === null ? e = [o] : e.push(o), t++;
          }
        }
        for (const p in m) {
          let r = m[p];
          const o = t;
          let P = !1;
          const i = t;
          if (r && typeof r == "object" && !Array.isArray(r)) {
            for (const a in r)
              if (!te.call(
                M.properties.postTypes.additionalProperties.anyOf[0].properties,
                a
              )) {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: a },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            if (r.label !== void 0 && typeof r.label != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/label",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/label/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.labels !== void 0) {
              let a = r.labels;
              if (a && typeof a == "object" && !Array.isArray(a)) {
                for (const n in a)
                  if (!te.call(
                    M.properties.postTypes.additionalProperties.anyOf[0].properties.labels.properties,
                    n
                  ) && typeof a[n] != "string") {
                    const f = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/" + n.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/additionalProperties/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
                if (a.name !== void 0 && typeof a.name != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/name",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/name/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.singular_name !== void 0 && typeof a.singular_name != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/singular_name",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/singular_name/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.add_new !== void 0 && typeof a.add_new != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/add_new",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/add_new/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.add_new_item !== void 0 && typeof a.add_new_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/add_new_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/add_new_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.edit_item !== void 0 && typeof a.edit_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/edit_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/edit_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.new_item !== void 0 && typeof a.new_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/new_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/new_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.view_item !== void 0 && typeof a.view_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/view_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/view_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.view_items !== void 0 && typeof a.view_items != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/view_items",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/view_items/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.search_items !== void 0 && typeof a.search_items != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/search_items",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/search_items/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.not_found !== void 0 && typeof a.not_found != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/not_found",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/not_found/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.not_found_in_trash !== void 0 && typeof a.not_found_in_trash != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/not_found_in_trash",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/not_found_in_trash/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.parent_item_colon !== void 0 && typeof a.parent_item_colon != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/parent_item_colon",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/parent_item_colon/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.all_items !== void 0 && typeof a.all_items != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/all_items",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/all_items/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.archives !== void 0 && typeof a.archives != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/archives",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/archives/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.attributes !== void 0 && typeof a.attributes != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/attributes",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/attributes/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.insert_into_item !== void 0 && typeof a.insert_into_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/insert_into_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/insert_into_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.uploaded_to_this_item !== void 0 && typeof a.uploaded_to_this_item != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/uploaded_to_this_item",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/uploaded_to_this_item/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.featured_image !== void 0 && typeof a.featured_image != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/featured_image",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/featured_image/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.set_featured_image !== void 0 && typeof a.set_featured_image != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/set_featured_image",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/set_featured_image/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.remove_featured_image !== void 0 && typeof a.remove_featured_image != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/remove_featured_image",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/remove_featured_image/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.use_featured_image !== void 0 && typeof a.use_featured_image != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/use_featured_image",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/use_featured_image/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.menu_name !== void 0 && typeof a.menu_name != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/menu_name",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/menu_name/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.filter_items_list !== void 0 && typeof a.filter_items_list != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/filter_items_list",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/filter_items_list/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.filter_by_date !== void 0 && typeof a.filter_by_date != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/filter_by_date",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/filter_by_date/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.items_list_navigation !== void 0 && typeof a.items_list_navigation != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/items_list_navigation",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/items_list_navigation/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.items_list !== void 0 && typeof a.items_list != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/items_list",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/items_list/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_published !== void 0 && typeof a.item_published != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_published",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_published/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_published_privately !== void 0 && typeof a.item_published_privately != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_published_privately",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_published_privately/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_reverted_to_draft !== void 0 && typeof a.item_reverted_to_draft != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_reverted_to_draft",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_reverted_to_draft/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_trashed !== void 0 && typeof a.item_trashed != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_trashed",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_trashed/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_scheduled !== void 0 && typeof a.item_scheduled != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_scheduled",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_scheduled/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_updated !== void 0 && typeof a.item_updated != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_updated",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_updated/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_link !== void 0 && typeof a.item_link != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_link",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_link/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
                if (a.item_link_description !== void 0 && typeof a.item_link_description != "string") {
                  const n = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels/item_link_description",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/properties/item_link_description/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  };
                  e === null ? e = [n] : e.push(n), t++;
                }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/labels",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/labels/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.description !== void 0 && typeof r.description != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/description",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/description/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.public !== void 0 && typeof r.public != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/public",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/public/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.hierarchical !== void 0 && typeof r.hierarchical != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/hierarchical",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/hierarchical/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.exclude_from_search !== void 0 && typeof r.exclude_from_search != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/exclude_from_search",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/exclude_from_search/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.publicly_queryable !== void 0 && typeof r.publicly_queryable != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/publicly_queryable",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/publicly_queryable/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.show_ui !== void 0 && typeof r.show_ui != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/show_ui",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/show_ui/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.show_in_menu !== void 0) {
              let a = r.show_in_menu;
              if (typeof a != "boolean" && typeof a != "string") {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/show_in_menu",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/show_in_menu/type",
                  keyword: "type",
                  params: {
                    type: M.properties.postTypes.additionalProperties.anyOf[0].properties.show_in_menu.type
                  },
                  message: "must be boolean,string"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.show_in_admin_bar !== void 0 && typeof r.show_in_admin_bar != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/show_in_admin_bar",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/show_in_admin_bar/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.show_in_nav_menus !== void 0 && typeof r.show_in_nav_menus != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/show_in_nav_menus",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/show_in_nav_menus/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.show_in_rest !== void 0 && typeof r.show_in_rest != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/show_in_rest",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/show_in_rest/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.rest_base !== void 0 && typeof r.rest_base != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rest_base",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rest_base/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.rest_namespace !== void 0 && typeof r.rest_namespace != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rest_namespace",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rest_namespace/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.rest_controller_class !== void 0 && typeof r.rest_controller_class != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rest_controller_class",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rest_controller_class/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.menu_icon !== void 0 && typeof r.menu_icon != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/menu_icon",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/menu_icon/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.menu_position !== void 0) {
              let a = r.menu_position;
              if (typeof a != "string" && !(typeof a == "number" && isFinite(a))) {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/menu_position",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/menu_position/type",
                  keyword: "type",
                  params: {
                    type: M.properties.postTypes.additionalProperties.anyOf[0].properties.menu_position.type
                  },
                  message: "must be string,number"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.rename_capabilities !== void 0 && typeof r.rename_capabilities != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rename_capabilities",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rename_capabilities/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.singular_capability_name !== void 0 && typeof r.singular_capability_name != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/singular_capability_name",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/singular_capability_name/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.plural_capability_name !== void 0 && typeof r.plural_capability_name != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/plural_capability_name",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/plural_capability_name/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.taxonomies !== void 0) {
              let a = r.taxonomies;
              if (Array.isArray(a)) {
                const n = a.length;
                for (let f = 0; f < n; f++)
                  if (typeof a[f] != "string") {
                    const _ = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/taxonomies/" + f,
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/taxonomies/items/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [_] : e.push(_), t++;
                  }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/taxonomies",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/taxonomies/type",
                  keyword: "type",
                  params: { type: "array" },
                  message: "must be array"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.query_var_name !== void 0 && typeof r.query_var_name != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/query_var_name",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/query_var_name/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.register_meta_box_cb !== void 0 && typeof r.register_meta_box_cb != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/register_meta_box_cb",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/register_meta_box_cb/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.enter_title_here !== void 0 && typeof r.enter_title_here != "string") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/enter_title_here",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/enter_title_here/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.capability_type !== void 0) {
              let a = r.capability_type;
              const n = t;
              let f = !1;
              const _ = t;
              if (typeof a != "string") {
                const c = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [c] : e.push(c), t++;
              }
              var ze = _ === t;
              if (f = f || ze, !f) {
                const c = t;
                if (Array.isArray(a)) {
                  if (a.length > 2) {
                    const g = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf/1/maxItems",
                      keyword: "maxItems",
                      params: { limit: 2 },
                      message: "must NOT have more than 2 items"
                    };
                    e === null ? e = [g] : e.push(g), t++;
                  }
                  if (a.length < 2) {
                    const g = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf/1/minItems",
                      keyword: "minItems",
                      params: { limit: 2 },
                      message: "must NOT have fewer than 2 items"
                    };
                    e === null ? e = [g] : e.push(g), t++;
                  }
                  const u = a.length;
                  for (let g = 0; g < u; g++)
                    if (typeof a[g] != "string") {
                      const y = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type/" + g,
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf/1/items/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [y] : e.push(y), t++;
                    }
                } else {
                  const u = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf/1/type",
                    keyword: "type",
                    params: { type: "array" },
                    message: "must be array"
                  };
                  e === null ? e = [u] : e.push(u), t++;
                }
                var ze = c === t;
                f = f || ze;
              }
              if (f)
                t = n, e !== null && (n ? e.length = n : e = null);
              else {
                const c = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capability_type",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capability_type/anyOf",
                  keyword: "anyOf",
                  params: {},
                  message: "must match a schema in anyOf"
                };
                e === null ? e = [c] : e.push(c), t++;
              }
            }
            if (r.capabilities !== void 0) {
              let a = r.capabilities;
              if (a && typeof a == "object" && !Array.isArray(a)) {
                for (const n in a)
                  if (typeof a[n] != "string") {
                    const f = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capabilities/" + n.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capabilities/additionalProperties/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [f] : e.push(f), t++;
                  }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/capabilities",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/capabilities/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.map_meta_cap !== void 0 && typeof r.map_meta_cap != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/map_meta_cap",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/map_meta_cap/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.supports !== void 0) {
              let a = r.supports;
              if (Array.isArray(a)) {
                const n = a.length;
                for (let f = 0; f < n; f++) {
                  let _ = a[f];
                  if (typeof _ != "string") {
                    const c = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/supports/" + f,
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/supports/allOf/0/items/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (!(_ === "title" || _ === "editor" || _ === "author" || _ === "thumbnail" || _ === "excerpt" || _ === "trackbacks" || _ === "custom-fields" || _ === "comments" || _ === "revisions" || _ === "page-attributes" || _ === "post-formats")) {
                    const c = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/supports/" + f,
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/supports/allOf/0/items/enum",
                      keyword: "enum",
                      params: {
                        allowedValues: M.properties.postTypes.additionalProperties.anyOf[0].properties.supports.allOf[0].items.enum
                      },
                      message: "must be equal to one of the allowed values"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/supports",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/supports/allOf/0/type",
                  keyword: "type",
                  params: { type: "array" },
                  message: "must be array"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
              if (Array.isArray(a)) {
                const n = a.length;
                for (let f = 0; f < n; f++)
                  if (typeof a[f] != "string") {
                    const _ = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/supports/" + f,
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/supports/allOf/1/items/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [_] : e.push(_), t++;
                  }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/supports",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/supports/allOf/1/type",
                  keyword: "type",
                  params: { type: "array" },
                  message: "must be array"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.has_archive !== void 0) {
              let a = r.has_archive;
              if (typeof a != "boolean" && typeof a != "string") {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/has_archive",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/has_archive/type",
                  keyword: "type",
                  params: {
                    type: M.properties.postTypes.additionalProperties.anyOf[0].properties.has_archive.type
                  },
                  message: "must be boolean,string"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.rewrite !== void 0) {
              let a = r.rewrite;
              const n = t;
              let f = !1;
              const _ = t;
              if (typeof a != "boolean") {
                const c = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/0/type",
                  keyword: "type",
                  params: { type: "boolean" },
                  message: "must be boolean"
                };
                e === null ? e = [c] : e.push(c), t++;
              }
              var He = _ === t;
              if (f = f || He, !f) {
                const c = t;
                if (a && typeof a == "object" && !Array.isArray(a)) {
                  for (const u in a)
                    if (!(u === "slug" || u === "with_front" || u === "pages" || u === "feeds" || u === "ep_mask")) {
                      const g = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite",
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: u
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [g] : e.push(g), t++;
                    }
                  if (a.slug !== void 0 && typeof a.slug != "string") {
                    const u = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite/slug",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/properties/slug/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (a.with_front !== void 0 && typeof a.with_front != "boolean") {
                    const u = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite/with_front",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/properties/with_front/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (a.pages !== void 0 && typeof a.pages != "boolean") {
                    const u = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite/pages",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/properties/pages/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (a.feeds !== void 0 && typeof a.feeds != "boolean") {
                    const u = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite/feeds",
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/properties/feeds/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [u] : e.push(u), t++;
                  }
                  if (a.ep_mask !== void 0) {
                    let u = a.ep_mask;
                    if (!(typeof u == "number" && isFinite(u))) {
                      const g = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite/ep_mask",
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/properties/ep_mask/type",
                        keyword: "type",
                        params: { type: "number" },
                        message: "must be number"
                      };
                      e === null ? e = [g] : e.push(g), t++;
                    }
                  }
                } else {
                  const u = {
                    instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite",
                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf/1/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [u] : e.push(u), t++;
                }
                var He = c === t;
                f = f || He;
              }
              if (f)
                t = n, e !== null && (n ? e.length = n : e = null);
              else {
                const c = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/rewrite",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/rewrite/anyOf",
                  keyword: "anyOf",
                  params: {},
                  message: "must match a schema in anyOf"
                };
                e === null ? e = [c] : e.push(c), t++;
              }
            }
            if (r.query_var !== void 0) {
              let a = r.query_var;
              if (typeof a != "boolean" && typeof a != "string") {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/query_var",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/query_var/type",
                  keyword: "type",
                  params: {
                    type: M.properties.postTypes.additionalProperties.anyOf[0].properties.query_var.type
                  },
                  message: "must be boolean,string"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.can_export !== void 0 && typeof r.can_export != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/can_export",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/can_export/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.delete_with_user !== void 0 && typeof r.delete_with_user != "boolean") {
              const a = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/delete_with_user",
                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/delete_with_user/type",
                keyword: "type",
                params: { type: "boolean" },
                message: "must be boolean"
              };
              e === null ? e = [a] : e.push(a), t++;
            }
            if (r.template !== void 0) {
              let a = r.template;
              if (Array.isArray(a)) {
                const n = a.length;
                for (let f = 0; f < n; f++) {
                  let _ = a[f];
                  if (Array.isArray(_)) {
                    if (_.length > 2) {
                      const l = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template/" + f,
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/maxItems",
                        keyword: "maxItems",
                        params: { limit: 2 },
                        message: "must NOT have more than 2 items"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (_.length < 2) {
                      const l = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template/" + f,
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/minItems",
                        keyword: "minItems",
                        params: { limit: 2 },
                        message: "must NOT have fewer than 2 items"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    const c = _.length;
                    if (c > 0 && typeof _[0] != "string") {
                      const l = {
                        instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(
                          /\//g,
                          "~1"
                        ) + "/template/" + f + "/0",
                        schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/0/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (c > 1) {
                      let l = _[1];
                      if (l && typeof l == "object" && !Array.isArray(l))
                        for (const u in l) {
                          let g = l[u];
                          const y = t;
                          let b = !1;
                          const O = t;
                          if (typeof g != "string") {
                            const d = {
                              instancePath: s + "/postTypes/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/template/" + f + "/1/" + u.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf/0/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [d] : e.push(
                              d
                            ), t++;
                          }
                          var pe = O === t;
                          if (b = b || pe, !b) {
                            const d = t;
                            if (typeof g != "boolean") {
                              const k = {
                                instancePath: s + "/postTypes/" + p.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ) + "/template/" + f + "/1/" + u.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ),
                                schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf/1/type",
                                keyword: "type",
                                params: {
                                  type: "boolean"
                                },
                                message: "must be boolean"
                              };
                              e === null ? e = [
                                k
                              ] : e.push(
                                k
                              ), t++;
                            }
                            var pe = d === t;
                            if (b = b || pe, !b) {
                              const k = t;
                              if (!(typeof g == "number" && isFinite(
                                g
                              ))) {
                                const w = {
                                  instancePath: s + "/postTypes/" + p.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ) + "/template/" + f + "/1/" + u.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf/2/type",
                                  keyword: "type",
                                  params: {
                                    type: "number"
                                  },
                                  message: "must be number"
                                };
                                e === null ? e = [
                                  w
                                ] : e.push(
                                  w
                                ), t++;
                              }
                              var pe = k === t;
                              if (b = b || pe, !b) {
                                const w = t;
                                if (Array.isArray(
                                  g
                                )) {
                                  const v = g.length;
                                  for (let S = 0; S < v; S++)
                                    C(
                                      g[S],
                                      {
                                        instancePath: s + "/postTypes/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/template/" + f + "/1/" + u.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/" + S,
                                        parentData: g,
                                        parentDataProperty: S,
                                        rootData: D
                                      }
                                    ) || (e = e === null ? C.errors : e.concat(
                                      C.errors
                                    ), t = e.length);
                                } else {
                                  const v = {
                                    instancePath: s + "/postTypes/" + p.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ) + "/template/" + f + "/1/" + u.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ),
                                    schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf/3/type",
                                    keyword: "type",
                                    params: {
                                      type: "array"
                                    },
                                    message: "must be array"
                                  };
                                  e === null ? e = [
                                    v
                                  ] : e.push(
                                    v
                                  ), t++;
                                }
                                var pe = w === t;
                                if (b = b || pe, !b) {
                                  const v = t;
                                  if (g && typeof g == "object" && !Array.isArray(
                                    g
                                  ))
                                    for (const N in g)
                                      C(
                                        g[N],
                                        {
                                          instancePath: s + "/postTypes/" + p.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ) + "/template/" + f + "/1/" + u.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ) + "/" + N.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          parentData: g,
                                          parentDataProperty: N,
                                          rootData: D
                                        }
                                      ) || (e = e === null ? C.errors : e.concat(
                                        C.errors
                                      ), t = e.length);
                                  else {
                                    const N = {
                                      instancePath: s + "/postTypes/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/template/" + f + "/1/" + u.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ),
                                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf/4/type",
                                      keyword: "type",
                                      params: {
                                        type: "object"
                                      },
                                      message: "must be object"
                                    };
                                    e === null ? e = [
                                      N
                                    ] : e.push(
                                      N
                                    ), t++;
                                  }
                                  var pe = v === t;
                                  b = b || pe;
                                }
                              }
                            }
                          }
                          if (b)
                            t = y, e !== null && (y ? e.length = y : e = null);
                          else {
                            const d = {
                              instancePath: s + "/postTypes/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/template/" + f + "/1/" + u.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/additionalProperties/anyOf",
                              keyword: "anyOf",
                              params: {},
                              message: "must match a schema in anyOf"
                            };
                            e === null ? e = [d] : e.push(
                              d
                            ), t++;
                          }
                        }
                      else {
                        const u = {
                          instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(
                            /\//g,
                            "~1"
                          ) + "/template/" + f + "/1",
                          schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/items/1/type",
                          keyword: "type",
                          params: { type: "object" },
                          message: "must be object"
                        };
                        e === null ? e = [u] : e.push(u), t++;
                      }
                    }
                  } else {
                    const c = {
                      instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template/" + f,
                      schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/items/type",
                      keyword: "type",
                      params: { type: "array" },
                      message: "must be array"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                }
              } else {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template/type",
                  keyword: "type",
                  params: { type: "array" },
                  message: "must be array"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
            if (r.template_lock !== void 0) {
              let a = r.template_lock;
              if (typeof a != "string" && typeof a != "boolean") {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template_lock",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template_lock/type",
                  keyword: "type",
                  params: {
                    type: M.properties.postTypes.additionalProperties.anyOf[0].properties.template_lock.type
                  },
                  message: "must be string,boolean"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
              if (!(a === "all" || a === "insert" || a === !1)) {
                const n = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/template_lock",
                  schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/properties/template_lock/enum",
                  keyword: "enum",
                  params: {
                    allowedValues: M.properties.postTypes.additionalProperties.anyOf[0].properties.template_lock.enum
                  },
                  message: "must be equal to one of the allowed values"
                };
                e === null ? e = [n] : e.push(n), t++;
              }
            }
          } else {
            const a = {
              instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/postTypes/additionalProperties/anyOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [a] : e.push(a), t++;
          }
          var Ye = i === t;
          if (P = P || Ye, !P) {
            const a = t;
            if (typeof r == "string") {
              if (!Ue.test(r)) {
                const f = {
                  instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                  schemaPath: "#/definitions/DataSources.ExecutionContextPath/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"
                  },
                  message: 'must match pattern "^(?!.*(?:^|/)\\.\\.(?:/|$))(?:\\./|/).*$"'
                };
                e === null ? e = [f] : e.push(f), t++;
              }
            } else {
              const f = {
                instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/definitions/DataSources.ExecutionContextPath/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            var Ye = a === t;
            P = P || Ye;
          }
          if (P)
            t = o, e !== null && (o ? e.length = o : e = null);
          else {
            const a = {
              instancePath: s + "/postTypes/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/postTypes/additionalProperties/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [a] : e.push(a), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/postTypes",
          schemaPath: "#/properties/postTypes/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.fonts !== void 0) {
      let m = h.fonts;
      if (m && typeof m == "object" && !Array.isArray(m))
        for (const p in m) {
          let r = m[p];
          const o = t;
          let P = !1;
          const i = t;
          R(r, {
            instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
            parentData: m,
            parentDataProperty: p,
            rootData: D
          }) || (e = e === null ? R.errors : e.concat(R.errors), t = e.length);
          var Je = i === t;
          if (P = P || Je, !P) {
            const a = t;
            if (r && typeof r == "object" && !Array.isArray(r)) {
              if (r.font_families === void 0) {
                const f = {
                  instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                  schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/required",
                  keyword: "required",
                  params: {
                    missingProperty: "font_families"
                  },
                  message: "must have required property 'font_families'"
                };
                e === null ? e = [f] : e.push(f), t++;
              }
              for (const f in r)
                if (!(f === "$schema" || f === "font_families")) {
                  const _ = {
                    instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                    schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/additionalProperties",
                    keyword: "additionalProperties",
                    params: { additionalProperty: f },
                    message: "must NOT have additional properties"
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              if (r.$schema !== void 0 && typeof r.$schema != "string") {
                const f = {
                  instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/$schema",
                  schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/%24schema/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [f] : e.push(f), t++;
              }
              if (r.font_families !== void 0) {
                let f = r.font_families;
                if (Array.isArray(f)) {
                  const _ = f.length;
                  for (let c = 0; c < _; c++) {
                    let l = f[c];
                    if (l && typeof l == "object" && !Array.isArray(l)) {
                      if (l.font_family_settings === void 0) {
                        const u = {
                          instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(
                            /\//g,
                            "~1"
                          ) + "/font_families/" + c,
                          schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/required",
                          keyword: "required",
                          params: {
                            missingProperty: "font_family_settings"
                          },
                          message: "must have required property 'font_family_settings'"
                        };
                        e === null ? e = [u] : e.push(u), t++;
                      }
                      for (const u in l)
                        if (!(u === "font_family_settings" || u === "categories")) {
                          const g = {
                            instancePath: s + "/fonts/" + p.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ) + "/font_families/" + c,
                            schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/additionalProperties",
                            keyword: "additionalProperties",
                            params: {
                              additionalProperty: u
                            },
                            message: "must NOT have additional properties"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      if (l.font_family_settings !== void 0) {
                        let u = l.font_family_settings;
                        if (u && typeof u == "object" && !Array.isArray(u)) {
                          if (u.name === void 0) {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/required",
                              keyword: "required",
                              params: {
                                missingProperty: "name"
                              },
                              message: "must have required property 'name'"
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                          if (u.slug === void 0) {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/required",
                              keyword: "required",
                              params: {
                                missingProperty: "slug"
                              },
                              message: "must have required property 'slug'"
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                          if (u.fontFamily === void 0) {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/required",
                              keyword: "required",
                              params: {
                                missingProperty: "fontFamily"
                              },
                              message: "must have required property 'fontFamily'"
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                          for (const g in u)
                            if (!(g === "name" || g === "slug" || g === "fontFamily" || g === "preview" || g === "fontFace")) {
                              const y = {
                                instancePath: s + "/fonts/" + p.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ) + "/font_families/" + c + "/font_family_settings",
                                schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/additionalProperties",
                                keyword: "additionalProperties",
                                params: {
                                  additionalProperty: g
                                },
                                message: "must NOT have additional properties"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                          if (u.name !== void 0 && typeof u.name != "string") {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings/name",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/name/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [
                              g
                            ] : e.push(
                              g
                            ), t++;
                          }
                          if (u.slug !== void 0 && typeof u.slug != "string") {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings/slug",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/slug/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [
                              g
                            ] : e.push(
                              g
                            ), t++;
                          }
                          if (u.fontFamily !== void 0 && typeof u.fontFamily != "string") {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings/fontFamily",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFamily/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [
                              g
                            ] : e.push(
                              g
                            ), t++;
                          }
                          if (u.preview !== void 0 && typeof u.preview != "string") {
                            const g = {
                              instancePath: s + "/fonts/" + p.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ) + "/font_families/" + c + "/font_family_settings/preview",
                              schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/preview/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [
                              g
                            ] : e.push(
                              g
                            ), t++;
                          }
                          if (u.fontFace !== void 0) {
                            let g = u.fontFace;
                            if (Array.isArray(
                              g
                            )) {
                              const y = g.length;
                              for (let b = 0; b < y; b++) {
                                let O = g[b];
                                if (O && typeof O == "object" && !Array.isArray(
                                  O
                                )) {
                                  if (O.fontFamily === void 0) {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b,
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/required",
                                      keyword: "required",
                                      params: {
                                        missingProperty: "fontFamily"
                                      },
                                      message: "must have required property 'fontFamily'"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.src === void 0) {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b,
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/required",
                                      keyword: "required",
                                      params: {
                                        missingProperty: "src"
                                      },
                                      message: "must have required property 'src'"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  for (const d in O)
                                    if (!te.call(
                                      M.properties.fonts.additionalProperties.anyOf[1].properties.font_families.items.properties.font_family_settings.properties.fontFace.items.properties,
                                      d
                                    )) {
                                      const A = {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b,
                                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/additionalProperties",
                                        keyword: "additionalProperties",
                                        params: {
                                          additionalProperty: d
                                        },
                                        message: "must NOT have additional properties"
                                      };
                                      e === null ? e = [
                                        A
                                      ] : e.push(
                                        A
                                      ), t++;
                                    }
                                  if (O.preview !== void 0 && typeof O.preview != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/preview",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/preview/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontFamily !== void 0 && typeof O.fontFamily != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontFamily",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontFamily/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontStyle !== void 0 && typeof O.fontStyle != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontStyle",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontStyle/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontWeight !== void 0) {
                                    let d = O.fontWeight;
                                    if (typeof d != "string" && !(typeof d == "number" && isFinite(
                                      d
                                    ))) {
                                      const A = {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontWeight",
                                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontWeight/type",
                                        keyword: "type",
                                        params: {
                                          type: M.properties.fonts.additionalProperties.anyOf[1].properties.font_families.items.properties.font_family_settings.properties.fontFace.items.properties.fontWeight.type
                                        },
                                        message: "must be string,number"
                                      };
                                      e === null ? e = [
                                        A
                                      ] : e.push(
                                        A
                                      ), t++;
                                    }
                                  }
                                  if (O.fontDisplay !== void 0) {
                                    let d = O.fontDisplay;
                                    if (typeof d != "string") {
                                      const A = {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontDisplay",
                                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontDisplay/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string"
                                      };
                                      e === null ? e = [
                                        A
                                      ] : e.push(
                                        A
                                      ), t++;
                                    }
                                    if (!(d === "auto" || d === "block" || d === "fallback" || d === "swap" || d === "optional")) {
                                      const A = {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontDisplay",
                                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontDisplay/enum",
                                        keyword: "enum",
                                        params: {
                                          allowedValues: M.properties.fonts.additionalProperties.anyOf[1].properties.font_families.items.properties.font_family_settings.properties.fontFace.items.properties.fontDisplay.enum
                                        },
                                        message: "must be equal to one of the allowed values"
                                      };
                                      e === null ? e = [
                                        A
                                      ] : e.push(
                                        A
                                      ), t++;
                                    }
                                  }
                                  if (O.src !== void 0) {
                                    let d = O.src;
                                    const A = t;
                                    let k = !1;
                                    const x = t;
                                    R(
                                      d,
                                      {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/src",
                                        parentData: O,
                                        parentDataProperty: "src",
                                        rootData: D
                                      }
                                    ) || (e = e === null ? R.errors : e.concat(
                                      R.errors
                                    ), t = e.length);
                                    var Ke = x === t;
                                    if (k = k || Ke, !k) {
                                      const w = t;
                                      if (Array.isArray(
                                        d
                                      )) {
                                        const v = d.length;
                                        for (let S = 0; S < v; S++)
                                          R(
                                            d[S],
                                            {
                                              instancePath: s + "/fonts/" + p.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/src/" + S,
                                              parentData: d,
                                              parentDataProperty: S,
                                              rootData: D
                                            }
                                          ) || (e = e === null ? R.errors : e.concat(
                                            R.errors
                                          ), t = e.length);
                                      } else {
                                        const v = {
                                          instancePath: s + "/fonts/" + p.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/src",
                                          schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/src/anyOf/1/type",
                                          keyword: "type",
                                          params: {
                                            type: "array"
                                          },
                                          message: "must be array"
                                        };
                                        e === null ? e = [
                                          v
                                        ] : e.push(
                                          v
                                        ), t++;
                                      }
                                      var Ke = w === t;
                                      k = k || Ke;
                                    }
                                    if (k)
                                      t = A, e !== null && (A ? e.length = A : e = null);
                                    else {
                                      const w = {
                                        instancePath: s + "/fonts/" + p.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/src",
                                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/src/anyOf",
                                        keyword: "anyOf",
                                        params: {},
                                        message: "must match a schema in anyOf"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (O.fontStretch !== void 0 && typeof O.fontStretch != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontStretch",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontStretch/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.ascentOverride !== void 0 && typeof O.ascentOverride != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/ascentOverride",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/ascentOverride/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.descentOverride !== void 0 && typeof O.descentOverride != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/descentOverride",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/descentOverride/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontVariant !== void 0 && typeof O.fontVariant != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontVariant",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontVariant/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontFeatureSettings !== void 0 && typeof O.fontFeatureSettings != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontFeatureSettings",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontFeatureSettings/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.fontVariationSettings !== void 0 && typeof O.fontVariationSettings != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/fontVariationSettings",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/fontVariationSettings/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.lineGapOverride !== void 0 && typeof O.lineGapOverride != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/lineGapOverride",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/lineGapOverride/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.sizeAdjust !== void 0 && typeof O.sizeAdjust != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/sizeAdjust",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/sizeAdjust/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  if (O.unicodeRange !== void 0 && typeof O.unicodeRange != "string") {
                                    const d = {
                                      instancePath: s + "/fonts/" + p.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b + "/unicodeRange",
                                      schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/properties/unicodeRange/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                } else {
                                  const d = {
                                    instancePath: s + "/fonts/" + p.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ) + "/font_families/" + c + "/font_family_settings/fontFace/" + b,
                                    schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/items/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                            } else {
                              const y = {
                                instancePath: s + "/fonts/" + p.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ) + "/font_families/" + c + "/font_family_settings/fontFace",
                                schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/properties/fontFace/type",
                                keyword: "type",
                                params: {
                                  type: "array"
                                },
                                message: "must be array"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                          }
                        } else {
                          const g = {
                            instancePath: s + "/fonts/" + p.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ) + "/font_families/" + c + "/font_family_settings",
                            schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/font_family_settings/type",
                            keyword: "type",
                            params: {
                              type: "object"
                            },
                            message: "must be object"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                      if (l.categories !== void 0) {
                        let u = l.categories;
                        if (Array.isArray(u)) {
                          const g = u.length;
                          for (let y = 0; y < g; y++)
                            if (typeof u[y] != "string") {
                              const b = {
                                instancePath: s + "/fonts/" + p.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ) + "/font_families/" + c + "/categories/" + y,
                                schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/categories/items/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                b
                              ] : e.push(
                                b
                              ), t++;
                            }
                        } else {
                          const g = {
                            instancePath: s + "/fonts/" + p.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ) + "/font_families/" + c + "/categories",
                            schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/properties/categories/type",
                            keyword: "type",
                            params: {
                              type: "array"
                            },
                            message: "must be array"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                    } else {
                      const u = {
                        instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/font_families/" + c,
                        schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/items/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [u] : e.push(u), t++;
                    }
                  }
                } else {
                  const _ = {
                    instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1") + "/font_families",
                    schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/properties/font_families/type",
                    keyword: "type",
                    params: { type: "array" },
                    message: "must be array"
                  };
                  e === null ? e = [_] : e.push(_), t++;
                }
              }
            } else {
              const f = {
                instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/properties/fonts/additionalProperties/anyOf/1/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object"
              };
              e === null ? e = [f] : e.push(f), t++;
            }
            var Je = a === t;
            P = P || Je;
          }
          if (P)
            t = o, e !== null && (o ? e.length = o : e = null);
          else {
            const a = {
              instancePath: s + "/fonts/" + p.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/properties/fonts/additionalProperties/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [a] : e.push(a), t++;
          }
        }
      else {
        const p = {
          instancePath: s + "/fonts",
          schemaPath: "#/properties/fonts/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.media !== void 0) {
      let m = h.media;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          const P = t;
          let i = !1;
          const a = t;
          R(o, {
            instancePath: s + "/media/" + r,
            parentData: m,
            parentDataProperty: r,
            rootData: D
          }) || (e = e === null ? R.errors : e.concat(R.errors), t = e.length);
          var Xe = a === t;
          if (i = i || Xe, !i) {
            const n = t;
            if (o && typeof o == "object" && !Array.isArray(o)) {
              if (o.source === void 0) {
                const _ = {
                  instancePath: s + "/media/" + r,
                  schemaPath: "#/properties/media/items/anyOf/1/required",
                  keyword: "required",
                  params: { missingProperty: "source" },
                  message: "must have required property 'source'"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              for (const _ in o)
                if (!(_ === "source" || _ === "title" || _ === "description" || _ === "alt" || _ === "caption")) {
                  const c = {
                    instancePath: s + "/media/" + r,
                    schemaPath: "#/properties/media/items/anyOf/1/additionalProperties",
                    keyword: "additionalProperties",
                    params: { additionalProperty: _ },
                    message: "must NOT have additional properties"
                  };
                  e === null ? e = [c] : e.push(c), t++;
                }
              if (o.source !== void 0 && (R(o.source, {
                instancePath: s + "/media/" + r + "/source",
                parentData: o,
                parentDataProperty: "source",
                rootData: D
              }) || (e = e === null ? R.errors : e.concat(R.errors), t = e.length)), o.title !== void 0 && typeof o.title != "string") {
                const _ = {
                  instancePath: s + "/media/" + r + "/title",
                  schemaPath: "#/properties/media/items/anyOf/1/properties/title/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              if (o.description !== void 0 && typeof o.description != "string") {
                const _ = {
                  instancePath: s + "/media/" + r + "/description",
                  schemaPath: "#/properties/media/items/anyOf/1/properties/description/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              if (o.alt !== void 0 && typeof o.alt != "string") {
                const _ = {
                  instancePath: s + "/media/" + r + "/alt",
                  schemaPath: "#/properties/media/items/anyOf/1/properties/alt/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
              if (o.caption !== void 0 && typeof o.caption != "string") {
                const _ = {
                  instancePath: s + "/media/" + r + "/caption",
                  schemaPath: "#/properties/media/items/anyOf/1/properties/caption/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                };
                e === null ? e = [_] : e.push(_), t++;
              }
            } else {
              const _ = {
                instancePath: s + "/media/" + r,
                schemaPath: "#/properties/media/items/anyOf/1/type",
                keyword: "type",
                params: { type: "object" },
                message: "must be object"
              };
              e === null ? e = [_] : e.push(_), t++;
            }
            var Xe = n === t;
            i = i || Xe;
          }
          if (i)
            t = P, e !== null && (P ? e.length = P : e = null);
          else {
            const n = {
              instancePath: s + "/media/" + r,
              schemaPath: "#/properties/media/items/anyOf",
              keyword: "anyOf",
              params: {},
              message: "must match a schema in anyOf"
            };
            e === null ? e = [n] : e.push(n), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/media",
          schemaPath: "#/properties/media/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.content !== void 0) {
      let m = h.content;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          if (o && typeof o == "object" && !Array.isArray(o)) {
            if (o.type === void 0) {
              const i = {
                instancePath: s + "/content/" + r,
                schemaPath: "#/properties/content/items/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property 'type'"
              };
              e === null ? e = [i] : e.push(i), t++;
            }
            const P = o.type;
            if (typeof P == "string")
              if (P === "mysql-dump")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.type === void 0) {
                    const i = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/0/required",
                      keyword: "required",
                      params: { missingProperty: "type" },
                      message: "must have required property 'type'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.source === void 0) {
                    const i = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/0/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "type" || i === "source")) {
                      const a = {
                        instancePath: s + "/content/" + r,
                        schemaPath: "#/properties/content/items/oneOf/0/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.type !== void 0) {
                    let i = o.type;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/0/properties/type/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "mysql-dump") {
                      const a = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/0/properties/type/const",
                        keyword: "const",
                        params: {
                          allowedValue: "mysql-dump"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.source !== void 0) {
                    let i = o.source;
                    const a = t;
                    let n = !1;
                    const f = t;
                    R(i, {
                      instancePath: s + "/content/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? R.errors : e.concat(
                      R.errors
                    ), t = e.length);
                    var Qe = f === t;
                    if (n = n || Qe, !n) {
                      const _ = t;
                      if (Array.isArray(i)) {
                        const l = i.length;
                        for (let u = 0; u < l; u++)
                          R(
                            i[u],
                            {
                              instancePath: s + "/content/" + r + "/source/" + u,
                              parentData: i,
                              parentDataProperty: u,
                              rootData: D
                            }
                          ) || (e = e === null ? R.errors : e.concat(
                            R.errors
                          ), t = e.length);
                      } else {
                        const l = {
                          instancePath: s + "/content/" + r + "/source",
                          schemaPath: "#/properties/content/items/oneOf/0/properties/source/anyOf/1/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array"
                        };
                        e === null ? e = [l] : e.push(l), t++;
                      }
                      var Qe = _ === t;
                      n = n || Qe;
                    }
                    if (n)
                      t = a, e !== null && (a ? e.length = a : e = null);
                    else {
                      const _ = {
                        instancePath: s + "/content/" + r + "/source",
                        schemaPath: "#/properties/content/items/oneOf/0/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [_] : e.push(_), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/0/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "posts")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.source === void 0) {
                    const i = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/1/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.type === void 0) {
                    const i = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/1/required",
                      keyword: "required",
                      params: { missingProperty: "type" },
                      message: "must have required property 'type'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "urlsMode" || i === "urlsMap" || i === "type" || i === "source")) {
                      const a = {
                        instancePath: s + "/content/" + r,
                        schemaPath: "#/properties/content/items/oneOf/1/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.urlsMode !== void 0) {
                    let i = o.urlsMode;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/urlsMode/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (!(i === "rewrite" || i === "preserve")) {
                      const a = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/urlsMode/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[1].properties.urlsMode.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.urlsMap !== void 0) {
                    let i = o.urlsMap;
                    if (i && typeof i == "object" && !Array.isArray(i)) {
                      for (const a in i) {
                        const n = t;
                        if (typeof a == "string") {
                          if (!Z(a)) {
                            const f = {
                              instancePath: s + "/content/" + r + "/urlsMap",
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"',
                              propertyName: a
                            };
                            e === null ? e = [f] : e.push(
                              f
                            ), t++;
                          }
                        } else {
                          const f = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string",
                            propertyName: a
                          };
                          e === null ? e = [f] : e.push(f), t++;
                        }
                        var bt = n === t;
                        if (!bt) {
                          const f = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/urlsMap/propertyNames",
                            keyword: "propertyNames",
                            params: {
                              propertyName: a
                            },
                            message: "property name must be valid"
                          };
                          e === null ? e = [f] : e.push(f), t++;
                        }
                      }
                      for (const a in i) {
                        let n = i[a];
                        if (typeof n == "string") {
                          if (!Z(n)) {
                            const f = {
                              instancePath: s + "/content/" + r + "/urlsMap/" + a.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"'
                            };
                            e === null ? e = [f] : e.push(
                              f
                            ), t++;
                          }
                        } else {
                          const f = {
                            instancePath: s + "/content/" + r + "/urlsMap/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [f] : e.push(f), t++;
                        }
                      }
                    } else {
                      const a = {
                        instancePath: s + "/content/" + r + "/urlsMap",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/urlsMap/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.type !== void 0) {
                    let i = o.type;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/type/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "posts") {
                      const a = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/type/const",
                        keyword: "const",
                        params: {
                          allowedValue: "posts"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.source !== void 0) {
                    let i = o.source;
                    const a = t;
                    let n = !1;
                    const f = t;
                    R(i, {
                      instancePath: s + "/content/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? R.errors : e.concat(
                      R.errors
                    ), t = e.length);
                    var xe = f === t;
                    if (n = n || xe, !n) {
                      const _ = t;
                      if (i && typeof i == "object" && !Array.isArray(i)) {
                        if (i.post_title === void 0) {
                          const l = {
                            instancePath: s + "/content/" + r + "/source",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/required",
                            keyword: "required",
                            params: {
                              missingProperty: "post_title"
                            },
                            message: "must have required property 'post_title'"
                          };
                          e === null ? e = [l] : e.push(l), t++;
                        }
                        for (const l in i)
                          if (!te.call(
                            M.properties.content.items.oneOf[1].properties.source.anyOf[1].properties,
                            l
                          )) {
                            const u = {
                              instancePath: s + "/content/" + r + "/source",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/additionalProperties",
                              keyword: "additionalProperties",
                              params: {
                                additionalProperty: l
                              },
                              message: "must NOT have additional properties"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        if (i.post_author !== void 0) {
                          let l = i.post_author;
                          if (!(typeof l == "number" && isFinite(l))) {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/post_author",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_author/type",
                              keyword: "type",
                              params: {
                                type: "number"
                              },
                              message: "must be number"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.post_date !== void 0 && typeof i.post_date != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_date",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_date/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_content !== void 0 && typeof i.post_content != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_content",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_content/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_title !== void 0 && typeof i.post_title != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_title",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_title/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_excerpt !== void 0 && typeof i.post_excerpt != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_excerpt",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_excerpt/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_status !== void 0) {
                          let l = i.post_status;
                          if (typeof l != "string") {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/post_status",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_status/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                          if (!(l === "publish" || l === "pending" || l === "draft" || l === "auto-draft" || l === "future" || l === "private" || l === "inherit" || l === "trash")) {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/post_status",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_status/enum",
                              keyword: "enum",
                              params: {
                                allowedValues: M.properties.content.items.oneOf[1].properties.source.anyOf[1].properties.post_status.enum
                              },
                              message: "must be equal to one of the allowed values"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.post_type !== void 0 && typeof i.post_type != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_type",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_type/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.comment_status !== void 0) {
                          let l = i.comment_status;
                          if (typeof l != "string") {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/comment_status",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/comment_status/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                          if (!(l === "open" || l === "closed")) {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/comment_status",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/comment_status/enum",
                              keyword: "enum",
                              params: {
                                allowedValues: M.properties.content.items.oneOf[1].properties.source.anyOf[1].properties.comment_status.enum
                              },
                              message: "must be equal to one of the allowed values"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.post_password !== void 0 && typeof i.post_password != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_password",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_password/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_name !== void 0 && typeof i.post_name != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_name",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_name/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_parent_name !== void 0 && typeof i.post_parent_name != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_parent_name",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_parent_name/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.menu_order !== void 0) {
                          let l = i.menu_order;
                          if (!(typeof l == "number" && isFinite(l))) {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/menu_order",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/menu_order/type",
                              keyword: "type",
                              params: {
                                type: "number"
                              },
                              message: "must be number"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.post_mime_type !== void 0 && typeof i.post_mime_type != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/post_mime_type",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_mime_type/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.guid !== void 0 && typeof i.guid != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/guid",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/guid/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                        if (i.post_category !== void 0) {
                          let l = i.post_category;
                          if (Array.isArray(l)) {
                            const u = l.length;
                            for (let g = 0; g < u; g++)
                              if (typeof l[g] != "string") {
                                const y = {
                                  instancePath: s + "/content/" + r + "/source/post_category/" + g,
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_category/items/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  y
                                ] : e.push(
                                  y
                                ), t++;
                              }
                          } else {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/post_category",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_category/type",
                              keyword: "type",
                              params: {
                                type: "array"
                              },
                              message: "must be array"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.post_tags !== void 0) {
                          let l = i.post_tags;
                          if (Array.isArray(l)) {
                            const u = l.length;
                            for (let g = 0; g < u; g++)
                              if (typeof l[g] != "string") {
                                const y = {
                                  instancePath: s + "/content/" + r + "/source/post_tags/" + g,
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_tags/items/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  y
                                ] : e.push(
                                  y
                                ), t++;
                              }
                          } else {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/post_tags",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/post_tags/type",
                              keyword: "type",
                              params: {
                                type: "array"
                              },
                              message: "must be array"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.tax_input !== void 0) {
                          let l = i.tax_input;
                          if (l && typeof l == "object" && !Array.isArray(l))
                            for (const u in l) {
                              let g = l[u];
                              if (Array.isArray(
                                g
                              )) {
                                const y = g.length;
                                for (let b = 0; b < y; b++)
                                  if (typeof g[b] != "string") {
                                    const O = {
                                      instancePath: s + "/content/" + r + "/source/tax_input/" + u.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/" + b,
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/tax_input/additionalProperties/items/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      O
                                    ] : e.push(
                                      O
                                    ), t++;
                                  }
                              } else {
                                const y = {
                                  instancePath: s + "/content/" + r + "/source/tax_input/" + u.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/tax_input/additionalProperties/type",
                                  keyword: "type",
                                  params: {
                                    type: "array"
                                  },
                                  message: "must be array"
                                };
                                e === null ? e = [
                                  y
                                ] : e.push(
                                  y
                                ), t++;
                              }
                            }
                          else {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/tax_input",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/tax_input/type",
                              keyword: "type",
                              params: {
                                type: "object"
                              },
                              message: "must be object"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.meta_input !== void 0) {
                          let l = i.meta_input;
                          if (l && typeof l == "object" && !Array.isArray(l))
                            for (const u in l) {
                              let g = l[u];
                              const y = t;
                              let b = !1;
                              const O = t;
                              if (typeof g != "string") {
                                const d = {
                                  instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/0/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  d
                                ] : e.push(
                                  d
                                ), t++;
                              }
                              var le = O === t;
                              if (b = b || le, !b) {
                                const d = t;
                                if (typeof g != "boolean") {
                                  const k = {
                                    instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ),
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/1/type",
                                    keyword: "type",
                                    params: {
                                      type: "boolean"
                                    },
                                    message: "must be boolean"
                                  };
                                  e === null ? e = [
                                    k
                                  ] : e.push(
                                    k
                                  ), t++;
                                }
                                var le = d === t;
                                if (b = b || le, !b) {
                                  const k = t;
                                  if (!(typeof g == "number" && isFinite(
                                    g
                                  ))) {
                                    const w = {
                                      instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ),
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/2/type",
                                      keyword: "type",
                                      params: {
                                        type: "number"
                                      },
                                      message: "must be number"
                                    };
                                    e === null ? e = [
                                      w
                                    ] : e.push(
                                      w
                                    ), t++;
                                  }
                                  var le = k === t;
                                  if (b = b || le, !b) {
                                    const w = t;
                                    if (Array.isArray(
                                      g
                                    )) {
                                      const v = g.length;
                                      for (let S = 0; S < v; S++)
                                        C(
                                          g[S],
                                          {
                                            instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ) + "/" + S,
                                            parentData: g,
                                            parentDataProperty: S,
                                            rootData: D
                                          }
                                        ) || (e = e === null ? C.errors : e.concat(
                                          C.errors
                                        ), t = e.length);
                                    } else {
                                      const v = {
                                        instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/3/type",
                                        keyword: "type",
                                        params: {
                                          type: "array"
                                        },
                                        message: "must be array"
                                      };
                                      e === null ? e = [
                                        v
                                      ] : e.push(
                                        v
                                      ), t++;
                                    }
                                    var le = w === t;
                                    if (b = b || le, !b) {
                                      const v = t;
                                      if (g && typeof g == "object" && !Array.isArray(
                                        g
                                      ))
                                        for (const N in g)
                                          C(
                                            g[N],
                                            {
                                              instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ) + "/" + N.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ),
                                              parentData: g,
                                              parentDataProperty: N,
                                              rootData: D
                                            }
                                          ) || (e = e === null ? C.errors : e.concat(
                                            C.errors
                                          ), t = e.length);
                                      else {
                                        const N = {
                                          instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/4/type",
                                          keyword: "type",
                                          params: {
                                            type: "object"
                                          },
                                          message: "must be object"
                                        };
                                        e === null ? e = [
                                          N
                                        ] : e.push(
                                          N
                                        ), t++;
                                      }
                                      var le = v === t;
                                      b = b || le;
                                    }
                                  }
                                }
                              }
                              if (b)
                                t = y, e !== null && (y ? e.length = y : e = null);
                              else {
                                const d = {
                                  instancePath: s + "/content/" + r + "/source/meta_input/" + u.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf",
                                  keyword: "anyOf",
                                  params: {},
                                  message: "must match a schema in anyOf"
                                };
                                e === null ? e = [
                                  d
                                ] : e.push(
                                  d
                                ), t++;
                              }
                            }
                          else {
                            const u = {
                              instancePath: s + "/content/" + r + "/source/meta_input",
                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/meta_input/type",
                              keyword: "type",
                              params: {
                                type: "object"
                              },
                              message: "must be object"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                        }
                        if (i.page_template !== void 0 && typeof i.page_template != "string") {
                          const l = {
                            instancePath: s + "/content/" + r + "/source/page_template",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/properties/page_template/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(
                            l
                          ), t++;
                        }
                      } else {
                        const l = {
                          instancePath: s + "/content/" + r + "/source",
                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/1/type",
                          keyword: "type",
                          params: { type: "object" },
                          message: "must be object"
                        };
                        e === null ? e = [l] : e.push(l), t++;
                      }
                      var xe = _ === t;
                      if (n = n || xe, !n) {
                        const l = t;
                        if (Array.isArray(i)) {
                          const g = i.length;
                          for (let y = 0; y < g; y++) {
                            let b = i[y];
                            const O = t;
                            let d = !1;
                            const A = t;
                            R(
                              b,
                              {
                                instancePath: s + "/content/" + r + "/source/" + y,
                                parentData: i,
                                parentDataProperty: y,
                                rootData: D
                              }
                            ) || (e = e === null ? R.errors : e.concat(
                              R.errors
                            ), t = e.length);
                            var Ze = A === t;
                            if (d = d || Ze, !d) {
                              const k = t;
                              if (b && typeof b == "object" && !Array.isArray(
                                b
                              )) {
                                if (b.post_title === void 0) {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y,
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/required",
                                    keyword: "required",
                                    params: {
                                      missingProperty: "post_title"
                                    },
                                    message: "must have required property 'post_title'"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                for (const w in b)
                                  if (!te.call(
                                    M.properties.content.items.oneOf[1].properties.source.anyOf[2].items.anyOf[1].properties,
                                    w
                                  )) {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y,
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/additionalProperties",
                                      keyword: "additionalProperties",
                                      params: {
                                        additionalProperty: w
                                      },
                                      message: "must NOT have additional properties"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                if (b.post_author !== void 0) {
                                  let w = b.post_author;
                                  if (!(typeof w == "number" && isFinite(
                                    w
                                  ))) {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/post_author",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_author/type",
                                      keyword: "type",
                                      params: {
                                        type: "number"
                                      },
                                      message: "must be number"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.post_date !== void 0 && typeof b.post_date != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_date",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_date/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_content !== void 0 && typeof b.post_content != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_content",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_content/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_title !== void 0 && typeof b.post_title != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_title",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_title/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_excerpt !== void 0 && typeof b.post_excerpt != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_excerpt",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_excerpt/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_status !== void 0) {
                                  let w = b.post_status;
                                  if (typeof w != "string") {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/post_status",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_status/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                  if (!(w === "publish" || w === "pending" || w === "draft" || w === "auto-draft" || w === "future" || w === "private" || w === "inherit" || w === "trash")) {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/post_status",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_status/enum",
                                      keyword: "enum",
                                      params: {
                                        allowedValues: M.properties.content.items.oneOf[1].properties.source.anyOf[2].items.anyOf[1].properties.post_status.enum
                                      },
                                      message: "must be equal to one of the allowed values"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.post_type !== void 0 && typeof b.post_type != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_type",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_type/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.comment_status !== void 0) {
                                  let w = b.comment_status;
                                  if (typeof w != "string") {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/comment_status",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/comment_status/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                  if (!(w === "open" || w === "closed")) {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/comment_status",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/comment_status/enum",
                                      keyword: "enum",
                                      params: {
                                        allowedValues: M.properties.content.items.oneOf[1].properties.source.anyOf[2].items.anyOf[1].properties.comment_status.enum
                                      },
                                      message: "must be equal to one of the allowed values"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.post_password !== void 0 && typeof b.post_password != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_password",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_password/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_name !== void 0 && typeof b.post_name != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_name",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_name/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_parent_name !== void 0 && typeof b.post_parent_name != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_parent_name",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_parent_name/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.menu_order !== void 0) {
                                  let w = b.menu_order;
                                  if (!(typeof w == "number" && isFinite(
                                    w
                                  ))) {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/menu_order",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/menu_order/type",
                                      keyword: "type",
                                      params: {
                                        type: "number"
                                      },
                                      message: "must be number"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.post_mime_type !== void 0 && typeof b.post_mime_type != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/post_mime_type",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_mime_type/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.guid !== void 0 && typeof b.guid != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/guid",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/guid/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                                if (b.post_category !== void 0) {
                                  let w = b.post_category;
                                  if (Array.isArray(
                                    w
                                  )) {
                                    const E = w.length;
                                    for (let v = 0; v < E; v++)
                                      if (typeof w[v] != "string") {
                                        const S = {
                                          instancePath: s + "/content/" + r + "/source/" + y + "/post_category/" + v,
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_category/items/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        };
                                        e === null ? e = [
                                          S
                                        ] : e.push(
                                          S
                                        ), t++;
                                      }
                                  } else {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/post_category",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_category/type",
                                      keyword: "type",
                                      params: {
                                        type: "array"
                                      },
                                      message: "must be array"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.post_tags !== void 0) {
                                  let w = b.post_tags;
                                  if (Array.isArray(
                                    w
                                  )) {
                                    const E = w.length;
                                    for (let v = 0; v < E; v++)
                                      if (typeof w[v] != "string") {
                                        const S = {
                                          instancePath: s + "/content/" + r + "/source/" + y + "/post_tags/" + v,
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_tags/items/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        };
                                        e === null ? e = [
                                          S
                                        ] : e.push(
                                          S
                                        ), t++;
                                      }
                                  } else {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/post_tags",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_tags/type",
                                      keyword: "type",
                                      params: {
                                        type: "array"
                                      },
                                      message: "must be array"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.tax_input !== void 0) {
                                  let w = b.tax_input;
                                  if (w && typeof w == "object" && !Array.isArray(
                                    w
                                  ))
                                    for (const E in w) {
                                      let v = w[E];
                                      if (Array.isArray(
                                        v
                                      )) {
                                        const S = v.length;
                                        for (let N = 0; N < S; N++)
                                          if (typeof v[N] != "string") {
                                            const Q = {
                                              instancePath: s + "/content/" + r + "/source/" + y + "/tax_input/" + E.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ) + "/" + N,
                                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/additionalProperties/items/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              Q
                                            ] : e.push(
                                              Q
                                            ), t++;
                                          }
                                      } else {
                                        const S = {
                                          instancePath: s + "/content/" + r + "/source/" + y + "/tax_input/" + E.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/additionalProperties/type",
                                          keyword: "type",
                                          params: {
                                            type: "array"
                                          },
                                          message: "must be array"
                                        };
                                        e === null ? e = [
                                          S
                                        ] : e.push(
                                          S
                                        ), t++;
                                      }
                                    }
                                  else {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/tax_input",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/type",
                                      keyword: "type",
                                      params: {
                                        type: "object"
                                      },
                                      message: "must be object"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.meta_input !== void 0) {
                                  let w = b.meta_input;
                                  if (w && typeof w == "object" && !Array.isArray(
                                    w
                                  ))
                                    for (const E in w) {
                                      let v = w[E];
                                      const S = t;
                                      let N = !1;
                                      const Q = t;
                                      if (typeof v != "string") {
                                        const ye = {
                                          instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/0/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        };
                                        e === null ? e = [
                                          ye
                                        ] : e.push(
                                          ye
                                        ), t++;
                                      }
                                      var fe = Q === t;
                                      if (N = N || fe, !N) {
                                        const ye = t;
                                        if (typeof v != "boolean") {
                                          const je = {
                                            instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ),
                                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/1/type",
                                            keyword: "type",
                                            params: {
                                              type: "boolean"
                                            },
                                            message: "must be boolean"
                                          };
                                          e === null ? e = [
                                            je
                                          ] : e.push(
                                            je
                                          ), t++;
                                        }
                                        var fe = ye === t;
                                        if (N = N || fe, !N) {
                                          const je = t;
                                          if (!(typeof v == "number" && isFinite(
                                            v
                                          ))) {
                                            const F = {
                                              instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ),
                                              schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/2/type",
                                              keyword: "type",
                                              params: {
                                                type: "number"
                                              },
                                              message: "must be number"
                                            };
                                            e === null ? e = [
                                              F
                                            ] : e.push(
                                              F
                                            ), t++;
                                          }
                                          var fe = je === t;
                                          if (N = N || fe, !N) {
                                            const F = t;
                                            if (Array.isArray(
                                              v
                                            )) {
                                              const H = v.length;
                                              for (let G = 0; G < H; G++)
                                                C(
                                                  v[G],
                                                  {
                                                    instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                                      /~/g,
                                                      "~0"
                                                    ).replace(
                                                      /\//g,
                                                      "~1"
                                                    ) + "/" + G,
                                                    parentData: v,
                                                    parentDataProperty: G,
                                                    rootData: D
                                                  }
                                                ) || (e = e === null ? C.errors : e.concat(
                                                  C.errors
                                                ), t = e.length);
                                            } else {
                                              const H = {
                                                instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                                  /~/g,
                                                  "~0"
                                                ).replace(
                                                  /\//g,
                                                  "~1"
                                                ),
                                                schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/3/type",
                                                keyword: "type",
                                                params: {
                                                  type: "array"
                                                },
                                                message: "must be array"
                                              };
                                              e === null ? e = [
                                                H
                                              ] : e.push(
                                                H
                                              ), t++;
                                            }
                                            var fe = F === t;
                                            if (N = N || fe, !N) {
                                              const H = t;
                                              if (v && typeof v == "object" && !Array.isArray(
                                                v
                                              ))
                                                for (const re in v)
                                                  C(
                                                    v[re],
                                                    {
                                                      instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                                        /~/g,
                                                        "~0"
                                                      ).replace(
                                                        /\//g,
                                                        "~1"
                                                      ) + "/" + re.replace(
                                                        /~/g,
                                                        "~0"
                                                      ).replace(
                                                        /\//g,
                                                        "~1"
                                                      ),
                                                      parentData: v,
                                                      parentDataProperty: re,
                                                      rootData: D
                                                    }
                                                  ) || (e = e === null ? C.errors : e.concat(
                                                    C.errors
                                                  ), t = e.length);
                                              else {
                                                const re = {
                                                  instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                                    /~/g,
                                                    "~0"
                                                  ).replace(
                                                    /\//g,
                                                    "~1"
                                                  ),
                                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/4/type",
                                                  keyword: "type",
                                                  params: {
                                                    type: "object"
                                                  },
                                                  message: "must be object"
                                                };
                                                e === null ? e = [
                                                  re
                                                ] : e.push(
                                                  re
                                                ), t++;
                                              }
                                              var fe = H === t;
                                              N = N || fe;
                                            }
                                          }
                                        }
                                      }
                                      if (N)
                                        t = S, e !== null && (S ? e.length = S : e = null);
                                      else {
                                        const ye = {
                                          instancePath: s + "/content/" + r + "/source/" + y + "/meta_input/" + E.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf",
                                          keyword: "anyOf",
                                          params: {},
                                          message: "must match a schema in anyOf"
                                        };
                                        e === null ? e = [
                                          ye
                                        ] : e.push(
                                          ye
                                        ), t++;
                                      }
                                    }
                                  else {
                                    const E = {
                                      instancePath: s + "/content/" + r + "/source/" + y + "/meta_input",
                                      schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/type",
                                      keyword: "type",
                                      params: {
                                        type: "object"
                                      },
                                      message: "must be object"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (b.page_template !== void 0 && typeof b.page_template != "string") {
                                  const w = {
                                    instancePath: s + "/content/" + r + "/source/" + y + "/page_template",
                                    schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/properties/page_template/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    w
                                  ] : e.push(
                                    w
                                  ), t++;
                                }
                              } else {
                                const w = {
                                  instancePath: s + "/content/" + r + "/source/" + y,
                                  schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf/1/type",
                                  keyword: "type",
                                  params: {
                                    type: "object"
                                  },
                                  message: "must be object"
                                };
                                e === null ? e = [
                                  w
                                ] : e.push(
                                  w
                                ), t++;
                              }
                              var Ze = k === t;
                              d = d || Ze;
                            }
                            if (d)
                              t = O, e !== null && (O ? e.length = O : e = null);
                            else {
                              const k = {
                                instancePath: s + "/content/" + r + "/source/" + y,
                                schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/items/anyOf",
                                keyword: "anyOf",
                                params: {},
                                message: "must match a schema in anyOf"
                              };
                              e === null ? e = [
                                k
                              ] : e.push(
                                k
                              ), t++;
                            }
                          }
                        } else {
                          const g = {
                            instancePath: s + "/content/" + r + "/source",
                            schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf/2/type",
                            keyword: "type",
                            params: {
                              type: "array"
                            },
                            message: "must be array"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                        var xe = l === t;
                        n = n || xe;
                      }
                    }
                    if (n)
                      t = a, e !== null && (a ? e.length = a : e = null);
                    else {
                      const _ = {
                        instancePath: s + "/content/" + r + "/source",
                        schemaPath: "#/properties/content/items/oneOf/1/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [_] : e.push(_), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/1/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "wxr") {
                const i = t;
                let a = !1, n = null;
                const f = t;
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.authorsMap === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/required",
                      keyword: "required",
                      params: {
                        missingProperty: "authorsMap"
                      },
                      message: "must have required property 'authorsMap'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.authorsMode === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/required",
                      keyword: "required",
                      params: {
                        missingProperty: "authorsMode"
                      },
                      message: "must have required property 'authorsMode'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.source === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.type === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/required",
                      keyword: "required",
                      params: { missingProperty: "type" },
                      message: "must have required property 'type'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  for (const c in o)
                    if (!te.call(
                      M.properties.content.items.oneOf[2].oneOf[0].properties,
                      c
                    )) {
                      const l = {
                        instancePath: s + "/content/" + r,
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: c
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  if (o.authorsMode !== void 0) {
                    let c = o.authorsMode;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/authorsMode/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (c !== "map") {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/authorsMode/const",
                        keyword: "const",
                        params: { allowedValue: "map" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.authorsMap !== void 0) {
                    let c = o.authorsMap;
                    if (c && typeof c == "object" && !Array.isArray(c)) {
                      for (const l in c)
                        if (typeof c[l] != "string") {
                          const u = {
                            instancePath: s + "/content/" + r + "/authorsMap/" + l.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/authorsMap/additionalProperties/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [u] : e.push(u), t++;
                        }
                    } else {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMap",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/authorsMap/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.urlsMode !== void 0) {
                    let c = o.urlsMode;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/urlsMode/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (!(c === "rewrite" || c === "preserve")) {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/urlsMode/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[2].oneOf[0].properties.urlsMode.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.urlsMap !== void 0) {
                    let c = o.urlsMap;
                    if (c && typeof c == "object" && !Array.isArray(c)) {
                      for (const l in c) {
                        const u = t;
                        if (typeof l == "string") {
                          if (!Z(l)) {
                            const g = {
                              instancePath: s + "/content/" + r + "/urlsMap",
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"',
                              propertyName: l
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                        } else {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string",
                            propertyName: l
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                        var Pt = u === t;
                        if (!Pt) {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/urlsMap/propertyNames",
                            keyword: "propertyNames",
                            params: {
                              propertyName: l
                            },
                            message: "property name must be valid"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                      for (const l in c) {
                        let u = c[l];
                        if (typeof u == "string") {
                          if (!Z(u)) {
                            const g = {
                              instancePath: s + "/content/" + r + "/urlsMap/" + l.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"'
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                        } else {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap/" + l.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                    } else {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMap",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/urlsMap/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.type !== void 0) {
                    let c = o.type;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/type/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (c !== "wxr") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/type/const",
                        keyword: "const",
                        params: { allowedValue: "wxr" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.source !== void 0) {
                    let c = o.source;
                    const l = t;
                    let u = !1;
                    const g = t;
                    R(c, {
                      instancePath: s + "/content/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? R.errors : e.concat(
                      R.errors
                    ), t = e.length);
                    var et = g === t;
                    if (u = u || et, !u) {
                      const y = t;
                      if (Array.isArray(c)) {
                        const O = c.length;
                        for (let d = 0; d < O; d++)
                          R(
                            c[d],
                            {
                              instancePath: s + "/content/" + r + "/source/" + d,
                              parentData: c,
                              parentDataProperty: d,
                              rootData: D
                            }
                          ) || (e = e === null ? R.errors : e.concat(
                            R.errors
                          ), t = e.length);
                      } else {
                        const O = {
                          instancePath: s + "/content/" + r + "/source",
                          schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/source/anyOf/1/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array"
                        };
                        e === null ? e = [O] : e.push(O), t++;
                      }
                      var et = y === t;
                      u = u || et;
                    }
                    if (u)
                      t = l, e !== null && (l ? e.length = l : e = null);
                    else {
                      const y = {
                        instancePath: s + "/content/" + r + "/source",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [y] : e.push(y), t++;
                    }
                  }
                  if (o.staticAssets !== void 0) {
                    let c = o.staticAssets;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/staticAssets",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/staticAssets/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (!(c === "fetch" || c === "hotlink")) {
                      const l = {
                        instancePath: s + "/content/" + r + "/staticAssets",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/staticAssets/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[2].oneOf[0].properties.staticAssets.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.defaultAuthorUsername !== void 0 && typeof o.defaultAuthorUsername != "string") {
                    const c = {
                      instancePath: s + "/content/" + r + "/defaultAuthorUsername",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/defaultAuthorUsername/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.importUsers !== void 0 && typeof o.importUsers != "boolean") {
                    const c = {
                      instancePath: s + "/content/" + r + "/importUsers",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/importUsers/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.importComments !== void 0 && typeof o.importComments != "boolean") {
                    const c = {
                      instancePath: s + "/content/" + r + "/importComments",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/properties/importComments/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                } else {
                  const c = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/2/oneOf/0/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [c] : e.push(c), t++;
                }
                var qe = f === t;
                qe && (a = !0, n = 0);
                const _ = t;
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.source === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.type === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/required",
                      keyword: "required",
                      params: { missingProperty: "type" },
                      message: "must have required property 'type'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  for (const c in o)
                    if (!te.call(
                      M.properties.content.items.oneOf[2].oneOf[1].properties,
                      c
                    )) {
                      const l = {
                        instancePath: s + "/content/" + r,
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: c
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  if (o.authorsMode !== void 0) {
                    let c = o.authorsMode;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/authorsMode/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (!(c === "create" || c === "default-author")) {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/authorsMode/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[2].oneOf[1].properties.authorsMode.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.authorsMap !== void 0) {
                    let c = o.authorsMap;
                    if (c && typeof c == "object" && !Array.isArray(c)) {
                      for (const l in c)
                        if (typeof c[l] != "string") {
                          const u = {
                            instancePath: s + "/content/" + r + "/authorsMap/" + l.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/authorsMap/additionalProperties/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [u] : e.push(u), t++;
                        }
                    } else {
                      const l = {
                        instancePath: s + "/content/" + r + "/authorsMap",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/authorsMap/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.urlsMode !== void 0) {
                    let c = o.urlsMode;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/urlsMode/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (!(c === "rewrite" || c === "preserve")) {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMode",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/urlsMode/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[2].oneOf[1].properties.urlsMode.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.urlsMap !== void 0) {
                    let c = o.urlsMap;
                    if (c && typeof c == "object" && !Array.isArray(c)) {
                      for (const l in c) {
                        const u = t;
                        if (typeof l == "string") {
                          if (!Z(l)) {
                            const g = {
                              instancePath: s + "/content/" + r + "/urlsMap",
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"',
                              propertyName: l
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                        } else {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string",
                            propertyName: l
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                        var _t = u === t;
                        if (!_t) {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap",
                            schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/urlsMap/propertyNames",
                            keyword: "propertyNames",
                            params: {
                              propertyName: l
                            },
                            message: "property name must be valid"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                      for (const l in c) {
                        let u = c[l];
                        if (typeof u == "string") {
                          if (!Z(u)) {
                            const g = {
                              instancePath: s + "/content/" + r + "/urlsMap/" + l.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/definitions/DataSources.URLReference/format",
                              keyword: "format",
                              params: {
                                format: "whatwg-http-url"
                              },
                              message: 'must match format "whatwg-http-url"'
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                        } else {
                          const g = {
                            instancePath: s + "/content/" + r + "/urlsMap/" + l.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/definitions/DataSources.URLReference/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [g] : e.push(g), t++;
                        }
                      }
                    } else {
                      const l = {
                        instancePath: s + "/content/" + r + "/urlsMap",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/urlsMap/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.type !== void 0) {
                    let c = o.type;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/type/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (c !== "wxr") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/type/const",
                        keyword: "const",
                        params: { allowedValue: "wxr" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.source !== void 0) {
                    let c = o.source;
                    const l = t;
                    let u = !1;
                    const g = t;
                    R(c, {
                      instancePath: s + "/content/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? R.errors : e.concat(
                      R.errors
                    ), t = e.length);
                    var tt = g === t;
                    if (u = u || tt, !u) {
                      const y = t;
                      if (Array.isArray(c)) {
                        const O = c.length;
                        for (let d = 0; d < O; d++)
                          R(
                            c[d],
                            {
                              instancePath: s + "/content/" + r + "/source/" + d,
                              parentData: c,
                              parentDataProperty: d,
                              rootData: D
                            }
                          ) || (e = e === null ? R.errors : e.concat(
                            R.errors
                          ), t = e.length);
                      } else {
                        const O = {
                          instancePath: s + "/content/" + r + "/source",
                          schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/source/anyOf/1/type",
                          keyword: "type",
                          params: { type: "array" },
                          message: "must be array"
                        };
                        e === null ? e = [O] : e.push(O), t++;
                      }
                      var tt = y === t;
                      u = u || tt;
                    }
                    if (u)
                      t = l, e !== null && (l ? e.length = l : e = null);
                    else {
                      const y = {
                        instancePath: s + "/content/" + r + "/source",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [y] : e.push(y), t++;
                    }
                  }
                  if (o.staticAssets !== void 0) {
                    let c = o.staticAssets;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/staticAssets",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/staticAssets/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (!(c === "fetch" || c === "hotlink")) {
                      const l = {
                        instancePath: s + "/content/" + r + "/staticAssets",
                        schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/staticAssets/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.content.items.oneOf[2].oneOf[1].properties.staticAssets.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                  if (o.defaultAuthorUsername !== void 0 && typeof o.defaultAuthorUsername != "string") {
                    const c = {
                      instancePath: s + "/content/" + r + "/defaultAuthorUsername",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/defaultAuthorUsername/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.importUsers !== void 0 && typeof o.importUsers != "boolean") {
                    const c = {
                      instancePath: s + "/content/" + r + "/importUsers",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/importUsers/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.importComments !== void 0 && typeof o.importComments != "boolean") {
                    const c = {
                      instancePath: s + "/content/" + r + "/importComments",
                      schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/properties/importComments/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                } else {
                  const c = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/2/oneOf/1/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [c] : e.push(c), t++;
                }
                var qe = _ === t;
                if (qe && a ? (a = !1, n = [n, 1]) : qe && (a = !0, n = 1), a)
                  t = i, e !== null && (i ? e.length = i : e = null);
                else {
                  const c = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/2/oneOf",
                    keyword: "oneOf",
                    params: { passingSchemas: n },
                    message: "must match exactly one schema in oneOf"
                  };
                  e === null ? e = [c] : e.push(c), t++;
                }
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.type === void 0) {
                    const c = {
                      instancePath: s + "/content/" + r,
                      schemaPath: "#/properties/content/items/oneOf/2/required",
                      keyword: "required",
                      params: { missingProperty: "type" },
                      message: "must have required property 'type'"
                    };
                    e === null ? e = [c] : e.push(c), t++;
                  }
                  if (o.type !== void 0) {
                    let c = o.type;
                    if (typeof c != "string") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/properties/type/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                    if (c !== "wxr") {
                      const l = {
                        instancePath: s + "/content/" + r + "/type",
                        schemaPath: "#/properties/content/items/oneOf/2/properties/type/const",
                        keyword: "const",
                        params: { allowedValue: "wxr" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [l] : e.push(l), t++;
                    }
                  }
                } else {
                  const c = {
                    instancePath: s + "/content/" + r,
                    schemaPath: "#/properties/content/items/oneOf/2/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [c] : e.push(c), t++;
                }
              } else {
                const i = {
                  instancePath: s + "/content/" + r,
                  schemaPath: "#/properties/content/items/discriminator",
                  keyword: "discriminator",
                  params: {
                    error: "mapping",
                    tag: "type",
                    tagValue: P
                  },
                  message: 'value of tag "type" must be in oneOf'
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            else {
              const i = {
                instancePath: s + "/content/" + r,
                schemaPath: "#/properties/content/items/discriminator",
                keyword: "discriminator",
                params: {
                  error: "tag",
                  tag: "type",
                  tagValue: P
                },
                message: 'tag "type" must be string'
              };
              e === null ? e = [i] : e.push(i), t++;
            }
          } else {
            const P = {
              instancePath: s + "/content/" + r,
              schemaPath: "#/properties/content/items/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [P] : e.push(P), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/content",
          schemaPath: "#/properties/content/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.users !== void 0) {
      let m = h.users;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          if (o && typeof o == "object" && !Array.isArray(o)) {
            if (o.username === void 0) {
              const P = {
                instancePath: s + "/users/" + r,
                schemaPath: "#/properties/users/items/required",
                keyword: "required",
                params: { missingProperty: "username" },
                message: "must have required property 'username'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.email === void 0) {
              const P = {
                instancePath: s + "/users/" + r,
                schemaPath: "#/properties/users/items/required",
                keyword: "required",
                params: { missingProperty: "email" },
                message: "must have required property 'email'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.role === void 0) {
              const P = {
                instancePath: s + "/users/" + r,
                schemaPath: "#/properties/users/items/required",
                keyword: "required",
                params: { missingProperty: "role" },
                message: "must have required property 'role'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.meta === void 0) {
              const P = {
                instancePath: s + "/users/" + r,
                schemaPath: "#/properties/users/items/required",
                keyword: "required",
                params: { missingProperty: "meta" },
                message: "must have required property 'meta'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            for (const P in o)
              if (!(P === "username" || P === "email" || P === "role" || P === "meta")) {
                const i = {
                  instancePath: s + "/users/" + r,
                  schemaPath: "#/properties/users/items/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: P },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            if (o.username !== void 0 && typeof o.username != "string") {
              const P = {
                instancePath: s + "/users/" + r + "/username",
                schemaPath: "#/properties/users/items/properties/username/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.email !== void 0 && typeof o.email != "string") {
              const P = {
                instancePath: s + "/users/" + r + "/email",
                schemaPath: "#/properties/users/items/properties/email/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.role !== void 0 && typeof o.role != "string") {
              const P = {
                instancePath: s + "/users/" + r + "/role",
                schemaPath: "#/properties/users/items/properties/role/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.meta !== void 0) {
              let P = o.meta;
              if (P && typeof P == "object" && !Array.isArray(P)) {
                for (const i in P)
                  if (typeof P[i] != "string") {
                    const a = {
                      instancePath: s + "/users/" + r + "/meta/" + i.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "#/properties/users/items/properties/meta/additionalProperties/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [a] : e.push(a), t++;
                  }
              } else {
                const i = {
                  instancePath: s + "/users/" + r + "/meta",
                  schemaPath: "#/properties/users/items/properties/meta/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            }
          } else {
            const P = {
              instancePath: s + "/users/" + r,
              schemaPath: "#/properties/users/items/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [P] : e.push(P), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/users",
          schemaPath: "#/properties/users/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.roles !== void 0) {
      let m = h.roles;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          if (o && typeof o == "object" && !Array.isArray(o)) {
            if (o.name === void 0) {
              const P = {
                instancePath: s + "/roles/" + r,
                schemaPath: "#/properties/roles/items/required",
                keyword: "required",
                params: { missingProperty: "name" },
                message: "must have required property 'name'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.capabilities === void 0) {
              const P = {
                instancePath: s + "/roles/" + r,
                schemaPath: "#/properties/roles/items/required",
                keyword: "required",
                params: { missingProperty: "capabilities" },
                message: "must have required property 'capabilities'"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            for (const P in o)
              if (!(P === "name" || P === "capabilities")) {
                const i = {
                  instancePath: s + "/roles/" + r,
                  schemaPath: "#/properties/roles/items/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: P },
                  message: "must NOT have additional properties"
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            if (o.name !== void 0 && typeof o.name != "string") {
              const P = {
                instancePath: s + "/roles/" + r + "/name",
                schemaPath: "#/properties/roles/items/properties/name/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string"
              };
              e === null ? e = [P] : e.push(P), t++;
            }
            if (o.capabilities !== void 0) {
              let P = o.capabilities;
              if (P && typeof P == "object" && !Array.isArray(P)) {
                for (const i in P)
                  if (typeof P[i] != "string") {
                    const a = {
                      instancePath: s + "/roles/" + r + "/capabilities/" + i.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "#/properties/roles/items/properties/capabilities/additionalProperties/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [a] : e.push(a), t++;
                  }
              } else {
                const i = {
                  instancePath: s + "/roles/" + r + "/capabilities",
                  schemaPath: "#/properties/roles/items/properties/capabilities/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object"
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            }
          } else {
            const P = {
              instancePath: s + "/roles/" + r,
              schemaPath: "#/properties/roles/items/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [P] : e.push(P), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/roles",
          schemaPath: "#/properties/roles/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
    if (h.additionalStepsAfterExecution !== void 0) {
      let m = h.additionalStepsAfterExecution;
      if (Array.isArray(m)) {
        const p = m.length;
        for (let r = 0; r < p; r++) {
          let o = m[r];
          if (o && typeof o == "object" && !Array.isArray(o)) {
            if (o.step === void 0) {
              const i = {
                instancePath: s + "/additionalStepsAfterExecution/" + r,
                schemaPath: "#/properties/additionalStepsAfterExecution/items/required",
                keyword: "required",
                params: { missingProperty: "step" },
                message: "must have required property 'step'"
              };
              e === null ? e = [i] : e.push(i), t++;
            }
            const P = o.step;
            if (typeof P == "string")
              if (P === "activatePlugin")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.pluginPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/required",
                      keyword: "required",
                      params: {
                        missingProperty: "pluginPath"
                      },
                      message: "must have required property 'pluginPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "pluginPath" || i === "humanReadableName")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "activatePlugin") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "activatePlugin"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.pluginPath !== void 0 && typeof o.pluginPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/pluginPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/properties/pluginPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/humanReadableName",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/properties/humanReadableName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/0/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "activateTheme")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.themeDirectoryName === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/required",
                      keyword: "required",
                      params: {
                        missingProperty: "themeDirectoryName"
                      },
                      message: "must have required property 'themeDirectoryName'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "themeDirectoryName" || i === "humanReadableName")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "activateTheme") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "activateTheme"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.themeDirectoryName !== void 0 && typeof o.themeDirectoryName != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/themeDirectoryName",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/properties/themeDirectoryName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/humanReadableName",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/properties/humanReadableName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/1/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "cp")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.fromPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/required",
                      keyword: "required",
                      params: {
                        missingProperty: "fromPath"
                      },
                      message: "must have required property 'fromPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.toPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/required",
                      keyword: "required",
                      params: {
                        missingProperty: "toPath"
                      },
                      message: "must have required property 'toPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "fromPath" || i === "toPath")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "cp") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/properties/step/const",
                        keyword: "const",
                        params: { allowedValue: "cp" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.fromPath !== void 0 && typeof o.fromPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/fromPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/properties/fromPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.toPath !== void 0 && typeof o.toPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/toPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/properties/toPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/2/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "defineConstants")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.constants === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/required",
                      keyword: "required",
                      params: {
                        missingProperty: "constants"
                      },
                      message: "must have required property 'constants'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "constants")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "defineConstants") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "defineConstants"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.constants !== void 0) {
                    let i = o.constants;
                    if (i && typeof i == "object" && !Array.isArray(i)) {
                      for (const a in i)
                        if (!(a === "WP_DEBUG" || a === "WP_DEBUG_LOG" || a === "WP_DEBUG_DISPLAY" || a === "SCRIPT_DEBUG")) {
                          let n = i[a];
                          if (typeof n != "boolean" && typeof n != "string" && !(typeof n == "number" && isFinite(n))) {
                            const f = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants/" + a.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/additionalProperties/type",
                              keyword: "type",
                              params: {
                                type: M.properties.additionalStepsAfterExecution.items.oneOf[3].properties.constants.additionalProperties.type
                              },
                              message: "must be boolean,string,number"
                            };
                            e === null ? e = [f] : e.push(
                              f
                            ), t++;
                          }
                        }
                      if (i.WP_DEBUG !== void 0 && typeof i.WP_DEBUG != "boolean") {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants/WP_DEBUG",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/properties/WP_DEBUG/type",
                          keyword: "type",
                          params: {
                            type: "boolean"
                          },
                          message: "must be boolean"
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                      if (i.WP_DEBUG_LOG !== void 0 && typeof i.WP_DEBUG_LOG != "boolean") {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants/WP_DEBUG_LOG",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/properties/WP_DEBUG_LOG/type",
                          keyword: "type",
                          params: {
                            type: "boolean"
                          },
                          message: "must be boolean"
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                      if (i.WP_DEBUG_DISPLAY !== void 0 && typeof i.WP_DEBUG_DISPLAY != "boolean") {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants/WP_DEBUG_DISPLAY",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/properties/WP_DEBUG_DISPLAY/type",
                          keyword: "type",
                          params: {
                            type: "boolean"
                          },
                          message: "must be boolean"
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                      if (i.SCRIPT_DEBUG !== void 0 && typeof i.SCRIPT_DEBUG != "boolean") {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants/SCRIPT_DEBUG",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/properties/SCRIPT_DEBUG/type",
                          keyword: "type",
                          params: {
                            type: "boolean"
                          },
                          message: "must be boolean"
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/constants",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/properties/constants/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/3/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "enableMultisite")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/4/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (i !== "step") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/4/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/4/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "enableMultisite") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/4/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "enableMultisite"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/4/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "importContent")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.content === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/required",
                      keyword: "required",
                      params: {
                        missingProperty: "content"
                      },
                      message: "must have required property 'content'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "content")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "importContent") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "importContent"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.content !== void 0) {
                    let i = o.content;
                    if (Array.isArray(i)) {
                      const a = i.length;
                      for (let n = 0; n < a; n++) {
                        let f = i[n];
                        const _ = t;
                        let c = !1;
                        const l = t;
                        if (f && typeof f == "object" && !Array.isArray(f)) {
                          if (f.type === void 0) {
                            const u = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/required",
                              keyword: "required",
                              params: {
                                missingProperty: "type"
                              },
                              message: "must have required property 'type'"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                          if (f.source === void 0) {
                            const u = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/required",
                              keyword: "required",
                              params: {
                                missingProperty: "source"
                              },
                              message: "must have required property 'source'"
                            };
                            e === null ? e = [u] : e.push(
                              u
                            ), t++;
                          }
                          for (const u in f)
                            if (!(u === "type" || u === "source")) {
                              const g = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/additionalProperties",
                                keyword: "additionalProperties",
                                params: {
                                  additionalProperty: u
                                },
                                message: "must NOT have additional properties"
                              };
                              e === null ? e = [
                                g
                              ] : e.push(
                                g
                              ), t++;
                            }
                          if (f.type !== void 0) {
                            let u = f.type;
                            if (typeof u != "string") {
                              const g = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/properties/type/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                g
                              ] : e.push(
                                g
                              ), t++;
                            }
                            if (u !== "mysql-dump") {
                              const g = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/properties/type/const",
                                keyword: "const",
                                params: {
                                  allowedValue: "mysql-dump"
                                },
                                message: "must be equal to constant"
                              };
                              e === null ? e = [
                                g
                              ] : e.push(
                                g
                              ), t++;
                            }
                          }
                          if (f.source !== void 0) {
                            let u = f.source;
                            const g = t;
                            let y = !1;
                            const b = t;
                            R(
                              u,
                              {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                parentData: f,
                                parentDataProperty: "source",
                                rootData: D
                              }
                            ) || (e = e === null ? R.errors : e.concat(
                              R.errors
                            ), t = e.length);
                            var st = b === t;
                            if (y = y || st, !y) {
                              const O = t;
                              if (Array.isArray(
                                u
                              )) {
                                const A = u.length;
                                for (let k = 0; k < A; k++)
                                  R(
                                    u[k],
                                    {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + k,
                                      parentData: u,
                                      parentDataProperty: k,
                                      rootData: D
                                    }
                                  ) || (e = e === null ? R.errors : e.concat(
                                    R.errors
                                  ), t = e.length);
                              } else {
                                const A = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/properties/source/anyOf/1/type",
                                  keyword: "type",
                                  params: {
                                    type: "array"
                                  },
                                  message: "must be array"
                                };
                                e === null ? e = [
                                  A
                                ] : e.push(
                                  A
                                ), t++;
                              }
                              var st = O === t;
                              y = y || st;
                            }
                            if (y)
                              t = g, e !== null && (g ? e.length = g : e = null);
                            else {
                              const O = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/properties/source/anyOf",
                                keyword: "anyOf",
                                params: {},
                                message: "must match a schema in anyOf"
                              };
                              e === null ? e = [
                                O
                              ] : e.push(
                                O
                              ), t++;
                            }
                          }
                        } else {
                          const u = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/0/type",
                            keyword: "type",
                            params: {
                              type: "object"
                            },
                            message: "must be object"
                          };
                          e === null ? e = [u] : e.push(u), t++;
                        }
                        var ge = l === t;
                        if (c = c || ge, !c) {
                          const u = t;
                          if (f && typeof f == "object" && !Array.isArray(f)) {
                            if (f.source === void 0) {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/required",
                                keyword: "required",
                                params: {
                                  missingProperty: "source"
                                },
                                message: "must have required property 'source'"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            if (f.type === void 0) {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/required",
                                keyword: "required",
                                params: {
                                  missingProperty: "type"
                                },
                                message: "must have required property 'type'"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            for (const y in f)
                              if (!(y === "urlsMode" || y === "urlsMap" || y === "type" || y === "source")) {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/additionalProperties",
                                  keyword: "additionalProperties",
                                  params: {
                                    additionalProperty: y
                                  },
                                  message: "must NOT have additional properties"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                            if (f.urlsMode !== void 0) {
                              let y = f.urlsMode;
                              if (typeof y != "string") {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/urlsMode/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                              if (!(y === "rewrite" || y === "preserve")) {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/urlsMode/enum",
                                  keyword: "enum",
                                  params: {
                                    allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.urlsMode.enum
                                  },
                                  message: "must be equal to one of the allowed values"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                            }
                            if (f.urlsMap !== void 0) {
                              let y = f.urlsMap;
                              if (y && typeof y == "object" && !Array.isArray(
                                y
                              )) {
                                for (const b in y) {
                                  const O = t;
                                  if (typeof b == "string") {
                                    if (!Z(
                                      b
                                    )) {
                                      const d = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                        schemaPath: "#/definitions/DataSources.URLReference/format",
                                        keyword: "format",
                                        params: {
                                          format: "whatwg-http-url"
                                        },
                                        message: 'must match format "whatwg-http-url"',
                                        propertyName: b
                                      };
                                      e === null ? e = [
                                        d
                                      ] : e.push(
                                        d
                                      ), t++;
                                    }
                                  } else {
                                    const d = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                      schemaPath: "#/definitions/DataSources.URLReference/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string",
                                      propertyName: b
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                  var wt = O === t;
                                  if (!wt) {
                                    const d = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/urlsMap/propertyNames",
                                      keyword: "propertyNames",
                                      params: {
                                        propertyName: b
                                      },
                                      message: "property name must be valid"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                }
                                for (const b in y) {
                                  let O = y[b];
                                  if (typeof O == "string") {
                                    if (!Z(
                                      O
                                    )) {
                                      const d = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + b.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        schemaPath: "#/definitions/DataSources.URLReference/format",
                                        keyword: "format",
                                        params: {
                                          format: "whatwg-http-url"
                                        },
                                        message: 'must match format "whatwg-http-url"'
                                      };
                                      e === null ? e = [
                                        d
                                      ] : e.push(
                                        d
                                      ), t++;
                                    }
                                  } else {
                                    const d = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + b.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ),
                                      schemaPath: "#/definitions/DataSources.URLReference/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      d
                                    ] : e.push(
                                      d
                                    ), t++;
                                  }
                                }
                              } else {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/urlsMap/type",
                                  keyword: "type",
                                  params: {
                                    type: "object"
                                  },
                                  message: "must be object"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                            }
                            if (f.type !== void 0) {
                              let y = f.type;
                              if (typeof y != "string") {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/type/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                              if (y !== "posts") {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/type/const",
                                  keyword: "const",
                                  params: {
                                    allowedValue: "posts"
                                  },
                                  message: "must be equal to constant"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                            }
                            if (f.source !== void 0) {
                              let y = f.source;
                              const b = t;
                              let O = !1;
                              const d = t;
                              R(
                                y,
                                {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                  parentData: f,
                                  parentDataProperty: "source",
                                  rootData: D
                                }
                              ) || (e = e === null ? R.errors : e.concat(
                                R.errors
                              ), t = e.length);
                              var Ee = d === t;
                              if (O = O || Ee, !O) {
                                const A = t;
                                if (y && typeof y == "object" && !Array.isArray(
                                  y
                                )) {
                                  if (y.post_title === void 0) {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/required",
                                      keyword: "required",
                                      params: {
                                        missingProperty: "post_title"
                                      },
                                      message: "must have required property 'post_title'"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  for (const x in y)
                                    if (!te.call(
                                      M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[1].properties,
                                      x
                                    )) {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/additionalProperties",
                                        keyword: "additionalProperties",
                                        params: {
                                          additionalProperty: x
                                        },
                                        message: "must NOT have additional properties"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  if (y.post_author !== void 0) {
                                    let x = y.post_author;
                                    if (!(typeof x == "number" && isFinite(
                                      x
                                    ))) {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_author",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_author/type",
                                        keyword: "type",
                                        params: {
                                          type: "number"
                                        },
                                        message: "must be number"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.post_date !== void 0 && typeof y.post_date != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_date",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_date/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_content !== void 0 && typeof y.post_content != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_content",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_content/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_title !== void 0 && typeof y.post_title != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_title",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_title/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_excerpt !== void 0 && typeof y.post_excerpt != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_excerpt",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_excerpt/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_status !== void 0) {
                                    let x = y.post_status;
                                    if (typeof x != "string") {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_status",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_status/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                    if (!(x === "publish" || x === "pending" || x === "draft" || x === "auto-draft" || x === "future" || x === "private" || x === "inherit" || x === "trash")) {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_status",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_status/enum",
                                        keyword: "enum",
                                        params: {
                                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[1].properties.post_status.enum
                                        },
                                        message: "must be equal to one of the allowed values"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.post_type !== void 0 && typeof y.post_type != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_type",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_type/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.comment_status !== void 0) {
                                    let x = y.comment_status;
                                    if (typeof x != "string") {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/comment_status",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/comment_status/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                    if (!(x === "open" || x === "closed")) {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/comment_status",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/comment_status/enum",
                                        keyword: "enum",
                                        params: {
                                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[1].properties.comment_status.enum
                                        },
                                        message: "must be equal to one of the allowed values"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.post_password !== void 0 && typeof y.post_password != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_password",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_password/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_name !== void 0 && typeof y.post_name != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_name",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_name/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_parent_name !== void 0 && typeof y.post_parent_name != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_parent_name",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_parent_name/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.menu_order !== void 0) {
                                    let x = y.menu_order;
                                    if (!(typeof x == "number" && isFinite(
                                      x
                                    ))) {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/menu_order",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/menu_order/type",
                                        keyword: "type",
                                        params: {
                                          type: "number"
                                        },
                                        message: "must be number"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.post_mime_type !== void 0 && typeof y.post_mime_type != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_mime_type",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_mime_type/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.guid !== void 0 && typeof y.guid != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/guid",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/guid/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                  if (y.post_category !== void 0) {
                                    let x = y.post_category;
                                    if (Array.isArray(
                                      x
                                    )) {
                                      const w = x.length;
                                      for (let E = 0; E < w; E++)
                                        if (typeof x[E] != "string") {
                                          const v = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_category/" + E,
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_category/items/type",
                                            keyword: "type",
                                            params: {
                                              type: "string"
                                            },
                                            message: "must be string"
                                          };
                                          e === null ? e = [
                                            v
                                          ] : e.push(
                                            v
                                          ), t++;
                                        }
                                    } else {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_category",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_category/type",
                                        keyword: "type",
                                        params: {
                                          type: "array"
                                        },
                                        message: "must be array"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.post_tags !== void 0) {
                                    let x = y.post_tags;
                                    if (Array.isArray(
                                      x
                                    )) {
                                      const w = x.length;
                                      for (let E = 0; E < w; E++)
                                        if (typeof x[E] != "string") {
                                          const v = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_tags/" + E,
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_tags/items/type",
                                            keyword: "type",
                                            params: {
                                              type: "string"
                                            },
                                            message: "must be string"
                                          };
                                          e === null ? e = [
                                            v
                                          ] : e.push(
                                            v
                                          ), t++;
                                        }
                                    } else {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/post_tags",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/post_tags/type",
                                        keyword: "type",
                                        params: {
                                          type: "array"
                                        },
                                        message: "must be array"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.tax_input !== void 0) {
                                    let x = y.tax_input;
                                    if (x && typeof x == "object" && !Array.isArray(
                                      x
                                    ))
                                      for (const w in x) {
                                        let E = x[w];
                                        if (Array.isArray(
                                          E
                                        )) {
                                          const v = E.length;
                                          for (let S = 0; S < v; S++)
                                            if (typeof E[S] != "string") {
                                              const N = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/tax_input/" + w.replace(
                                                  /~/g,
                                                  "~0"
                                                ).replace(
                                                  /\//g,
                                                  "~1"
                                                ) + "/" + S,
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/tax_input/additionalProperties/items/type",
                                                keyword: "type",
                                                params: {
                                                  type: "string"
                                                },
                                                message: "must be string"
                                              };
                                              e === null ? e = [
                                                N
                                              ] : e.push(
                                                N
                                              ), t++;
                                            }
                                        } else {
                                          const v = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/tax_input/" + w.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ),
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/tax_input/additionalProperties/type",
                                            keyword: "type",
                                            params: {
                                              type: "array"
                                            },
                                            message: "must be array"
                                          };
                                          e === null ? e = [
                                            v
                                          ] : e.push(
                                            v
                                          ), t++;
                                        }
                                      }
                                    else {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/tax_input",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/tax_input/type",
                                        keyword: "type",
                                        params: {
                                          type: "object"
                                        },
                                        message: "must be object"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.meta_input !== void 0) {
                                    let x = y.meta_input;
                                    if (x && typeof x == "object" && !Array.isArray(
                                      x
                                    ))
                                      for (const w in x) {
                                        let E = x[w];
                                        const v = t;
                                        let S = !1;
                                        const N = t;
                                        if (typeof E != "string") {
                                          const Q = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ),
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/0/type",
                                            keyword: "type",
                                            params: {
                                              type: "string"
                                            },
                                            message: "must be string"
                                          };
                                          e === null ? e = [
                                            Q
                                          ] : e.push(
                                            Q
                                          ), t++;
                                        }
                                        var ue = N === t;
                                        if (S = S || ue, !S) {
                                          const Q = t;
                                          if (typeof E != "boolean") {
                                            const he = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                /~/g,
                                                "~0"
                                              ).replace(
                                                /\//g,
                                                "~1"
                                              ),
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/1/type",
                                              keyword: "type",
                                              params: {
                                                type: "boolean"
                                              },
                                              message: "must be boolean"
                                            };
                                            e === null ? e = [
                                              he
                                            ] : e.push(
                                              he
                                            ), t++;
                                          }
                                          var ue = Q === t;
                                          if (S = S || ue, !S) {
                                            const he = t;
                                            if (!(typeof E == "number" && isFinite(
                                              E
                                            ))) {
                                              const T = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                  /~/g,
                                                  "~0"
                                                ).replace(
                                                  /\//g,
                                                  "~1"
                                                ),
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/2/type",
                                                keyword: "type",
                                                params: {
                                                  type: "number"
                                                },
                                                message: "must be number"
                                              };
                                              e === null ? e = [
                                                T
                                              ] : e.push(
                                                T
                                              ), t++;
                                            }
                                            var ue = he === t;
                                            if (S = S || ue, !S) {
                                              const T = t;
                                              if (Array.isArray(
                                                E
                                              )) {
                                                const B = E.length;
                                                for (let H = 0; H < B; H++)
                                                  C(
                                                    E[H],
                                                    {
                                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                        /~/g,
                                                        "~0"
                                                      ).replace(
                                                        /\//g,
                                                        "~1"
                                                      ) + "/" + H,
                                                      parentData: E,
                                                      parentDataProperty: H,
                                                      rootData: D
                                                    }
                                                  ) || (e = e === null ? C.errors : e.concat(
                                                    C.errors
                                                  ), t = e.length);
                                              } else {
                                                const B = {
                                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                    /~/g,
                                                    "~0"
                                                  ).replace(
                                                    /\//g,
                                                    "~1"
                                                  ),
                                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/3/type",
                                                  keyword: "type",
                                                  params: {
                                                    type: "array"
                                                  },
                                                  message: "must be array"
                                                };
                                                e === null ? e = [
                                                  B
                                                ] : e.push(
                                                  B
                                                ), t++;
                                              }
                                              var ue = T === t;
                                              if (S = S || ue, !S) {
                                                const B = t;
                                                if (E && typeof E == "object" && !Array.isArray(
                                                  E
                                                ))
                                                  for (const G in E)
                                                    C(
                                                      E[G],
                                                      {
                                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                          /~/g,
                                                          "~0"
                                                        ).replace(
                                                          /\//g,
                                                          "~1"
                                                        ) + "/" + G.replace(
                                                          /~/g,
                                                          "~0"
                                                        ).replace(
                                                          /\//g,
                                                          "~1"
                                                        ),
                                                        parentData: E,
                                                        parentDataProperty: G,
                                                        rootData: D
                                                      }
                                                    ) || (e = e === null ? C.errors : e.concat(
                                                      C.errors
                                                    ), t = e.length);
                                                else {
                                                  const G = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                                      /~/g,
                                                      "~0"
                                                    ).replace(
                                                      /\//g,
                                                      "~1"
                                                    ),
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf/4/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "object"
                                                    },
                                                    message: "must be object"
                                                  };
                                                  e === null ? e = [
                                                    G
                                                  ] : e.push(
                                                    G
                                                  ), t++;
                                                }
                                                var ue = B === t;
                                                S = S || ue;
                                              }
                                            }
                                          }
                                        }
                                        if (S)
                                          t = v, e !== null && (v ? e.length = v : e = null);
                                        else {
                                          const Q = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input/" + w.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ),
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/additionalProperties/anyOf",
                                            keyword: "anyOf",
                                            params: {},
                                            message: "must match a schema in anyOf"
                                          };
                                          e === null ? e = [
                                            Q
                                          ] : e.push(
                                            Q
                                          ), t++;
                                        }
                                      }
                                    else {
                                      const w = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/meta_input",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/meta_input/type",
                                        keyword: "type",
                                        params: {
                                          type: "object"
                                        },
                                        message: "must be object"
                                      };
                                      e === null ? e = [
                                        w
                                      ] : e.push(
                                        w
                                      ), t++;
                                    }
                                  }
                                  if (y.page_template !== void 0 && typeof y.page_template != "string") {
                                    const x = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/page_template",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/properties/page_template/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      x
                                    ] : e.push(
                                      x
                                    ), t++;
                                  }
                                } else {
                                  const x = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/1/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    x
                                  ] : e.push(
                                    x
                                  ), t++;
                                }
                                var Ee = A === t;
                                if (O = O || Ee, !O) {
                                  const x = t;
                                  if (Array.isArray(
                                    y
                                  )) {
                                    const E = y.length;
                                    for (let v = 0; v < E; v++) {
                                      let S = y[v];
                                      const N = t;
                                      let Q = !1;
                                      const ye = t;
                                      R(
                                        S,
                                        {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                          parentData: y,
                                          parentDataProperty: v,
                                          rootData: D
                                        }
                                      ) || (e = e === null ? R.errors : e.concat(
                                        R.errors
                                      ), t = e.length);
                                      var rt = ye === t;
                                      if (Q = Q || rt, !Q) {
                                        const he = t;
                                        if (S && typeof S == "object" && !Array.isArray(
                                          S
                                        )) {
                                          if (S.post_title === void 0) {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/required",
                                              keyword: "required",
                                              params: {
                                                missingProperty: "post_title"
                                              },
                                              message: "must have required property 'post_title'"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          for (const T in S)
                                            if (!te.call(
                                              M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[2].items.anyOf[1].properties,
                                              T
                                            )) {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/additionalProperties",
                                                keyword: "additionalProperties",
                                                params: {
                                                  additionalProperty: T
                                                },
                                                message: "must NOT have additional properties"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          if (S.post_author !== void 0) {
                                            let T = S.post_author;
                                            if (!(typeof T == "number" && isFinite(
                                              T
                                            ))) {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_author",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_author/type",
                                                keyword: "type",
                                                params: {
                                                  type: "number"
                                                },
                                                message: "must be number"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.post_date !== void 0 && typeof S.post_date != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_date",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_date/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_content !== void 0 && typeof S.post_content != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_content",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_content/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_title !== void 0 && typeof S.post_title != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_title",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_title/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_excerpt !== void 0 && typeof S.post_excerpt != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_excerpt",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_excerpt/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_status !== void 0) {
                                            let T = S.post_status;
                                            if (typeof T != "string") {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_status",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_status/type",
                                                keyword: "type",
                                                params: {
                                                  type: "string"
                                                },
                                                message: "must be string"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                            if (!(T === "publish" || T === "pending" || T === "draft" || T === "auto-draft" || T === "future" || T === "private" || T === "inherit" || T === "trash")) {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_status",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_status/enum",
                                                keyword: "enum",
                                                params: {
                                                  allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[2].items.anyOf[1].properties.post_status.enum
                                                },
                                                message: "must be equal to one of the allowed values"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.post_type !== void 0 && typeof S.post_type != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_type",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_type/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.comment_status !== void 0) {
                                            let T = S.comment_status;
                                            if (typeof T != "string") {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/comment_status",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/comment_status/type",
                                                keyword: "type",
                                                params: {
                                                  type: "string"
                                                },
                                                message: "must be string"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                            if (!(T === "open" || T === "closed")) {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/comment_status",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/comment_status/enum",
                                                keyword: "enum",
                                                params: {
                                                  allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[1].properties.source.anyOf[2].items.anyOf[1].properties.comment_status.enum
                                                },
                                                message: "must be equal to one of the allowed values"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.post_password !== void 0 && typeof S.post_password != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_password",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_password/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_name !== void 0 && typeof S.post_name != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_name",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_name/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_parent_name !== void 0 && typeof S.post_parent_name != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_parent_name",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_parent_name/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.menu_order !== void 0) {
                                            let T = S.menu_order;
                                            if (!(typeof T == "number" && isFinite(
                                              T
                                            ))) {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/menu_order",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/menu_order/type",
                                                keyword: "type",
                                                params: {
                                                  type: "number"
                                                },
                                                message: "must be number"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.post_mime_type !== void 0 && typeof S.post_mime_type != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_mime_type",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_mime_type/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.guid !== void 0 && typeof S.guid != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/guid",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/guid/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                          if (S.post_category !== void 0) {
                                            let T = S.post_category;
                                            if (Array.isArray(
                                              T
                                            )) {
                                              const F = T.length;
                                              for (let B = 0; B < F; B++)
                                                if (typeof T[B] != "string") {
                                                  const H = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_category/" + B,
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_category/items/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "string"
                                                    },
                                                    message: "must be string"
                                                  };
                                                  e === null ? e = [
                                                    H
                                                  ] : e.push(
                                                    H
                                                  ), t++;
                                                }
                                            } else {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_category",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_category/type",
                                                keyword: "type",
                                                params: {
                                                  type: "array"
                                                },
                                                message: "must be array"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.post_tags !== void 0) {
                                            let T = S.post_tags;
                                            if (Array.isArray(
                                              T
                                            )) {
                                              const F = T.length;
                                              for (let B = 0; B < F; B++)
                                                if (typeof T[B] != "string") {
                                                  const H = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_tags/" + B,
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_tags/items/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "string"
                                                    },
                                                    message: "must be string"
                                                  };
                                                  e === null ? e = [
                                                    H
                                                  ] : e.push(
                                                    H
                                                  ), t++;
                                                }
                                            } else {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/post_tags",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/post_tags/type",
                                                keyword: "type",
                                                params: {
                                                  type: "array"
                                                },
                                                message: "must be array"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.tax_input !== void 0) {
                                            let T = S.tax_input;
                                            if (T && typeof T == "object" && !Array.isArray(
                                              T
                                            ))
                                              for (const F in T) {
                                                let B = T[F];
                                                if (Array.isArray(
                                                  B
                                                )) {
                                                  const H = B.length;
                                                  for (let G = 0; G < H; G++)
                                                    if (typeof B[G] != "string") {
                                                      const re = {
                                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/tax_input/" + F.replace(
                                                          /~/g,
                                                          "~0"
                                                        ).replace(
                                                          /\//g,
                                                          "~1"
                                                        ) + "/" + G,
                                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/additionalProperties/items/type",
                                                        keyword: "type",
                                                        params: {
                                                          type: "string"
                                                        },
                                                        message: "must be string"
                                                      };
                                                      e === null ? e = [
                                                        re
                                                      ] : e.push(
                                                        re
                                                      ), t++;
                                                    }
                                                } else {
                                                  const H = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/tax_input/" + F.replace(
                                                      /~/g,
                                                      "~0"
                                                    ).replace(
                                                      /\//g,
                                                      "~1"
                                                    ),
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/additionalProperties/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "array"
                                                    },
                                                    message: "must be array"
                                                  };
                                                  e === null ? e = [
                                                    H
                                                  ] : e.push(
                                                    H
                                                  ), t++;
                                                }
                                              }
                                            else {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/tax_input",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/tax_input/type",
                                                keyword: "type",
                                                params: {
                                                  type: "object"
                                                },
                                                message: "must be object"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.meta_input !== void 0) {
                                            let T = S.meta_input;
                                            if (T && typeof T == "object" && !Array.isArray(
                                              T
                                            ))
                                              for (const F in T) {
                                                let B = T[F];
                                                const H = t;
                                                let G = !1;
                                                const re = t;
                                                if (typeof B != "string") {
                                                  const be = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                      /~/g,
                                                      "~0"
                                                    ).replace(
                                                      /\//g,
                                                      "~1"
                                                    ),
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/0/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "string"
                                                    },
                                                    message: "must be string"
                                                  };
                                                  e === null ? e = [
                                                    be
                                                  ] : e.push(
                                                    be
                                                  ), t++;
                                                }
                                                var ce = re === t;
                                                if (G = G || ce, !G) {
                                                  const be = t;
                                                  if (typeof B != "boolean") {
                                                    const Re = {
                                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                        /~/g,
                                                        "~0"
                                                      ).replace(
                                                        /\//g,
                                                        "~1"
                                                      ),
                                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/1/type",
                                                      keyword: "type",
                                                      params: {
                                                        type: "boolean"
                                                      },
                                                      message: "must be boolean"
                                                    };
                                                    e === null ? e = [
                                                      Re
                                                    ] : e.push(
                                                      Re
                                                    ), t++;
                                                  }
                                                  var ce = be === t;
                                                  if (G = G || ce, !G) {
                                                    const Re = t;
                                                    if (!(typeof B == "number" && isFinite(
                                                      B
                                                    ))) {
                                                      const Me = {
                                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                          /~/g,
                                                          "~0"
                                                        ).replace(
                                                          /\//g,
                                                          "~1"
                                                        ),
                                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/2/type",
                                                        keyword: "type",
                                                        params: {
                                                          type: "number"
                                                        },
                                                        message: "must be number"
                                                      };
                                                      e === null ? e = [
                                                        Me
                                                      ] : e.push(
                                                        Me
                                                      ), t++;
                                                    }
                                                    var ce = Re === t;
                                                    if (G = G || ce, !G) {
                                                      const Me = t;
                                                      if (Array.isArray(
                                                        B
                                                      )) {
                                                        const Pe = B.length;
                                                        for (let De = 0; De < Pe; De++)
                                                          C(
                                                            B[De],
                                                            {
                                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                                /~/g,
                                                                "~0"
                                                              ).replace(
                                                                /\//g,
                                                                "~1"
                                                              ) + "/" + De,
                                                              parentData: B,
                                                              parentDataProperty: De,
                                                              rootData: D
                                                            }
                                                          ) || (e = e === null ? C.errors : e.concat(
                                                            C.errors
                                                          ), t = e.length);
                                                      } else {
                                                        const Pe = {
                                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                            /~/g,
                                                            "~0"
                                                          ).replace(
                                                            /\//g,
                                                            "~1"
                                                          ),
                                                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/3/type",
                                                          keyword: "type",
                                                          params: {
                                                            type: "array"
                                                          },
                                                          message: "must be array"
                                                        };
                                                        e === null ? e = [
                                                          Pe
                                                        ] : e.push(
                                                          Pe
                                                        ), t++;
                                                      }
                                                      var ce = Me === t;
                                                      if (G = G || ce, !G) {
                                                        const Pe = t;
                                                        if (B && typeof B == "object" && !Array.isArray(
                                                          B
                                                        ))
                                                          for (const _e in B)
                                                            C(
                                                              B[_e],
                                                              {
                                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                                  /~/g,
                                                                  "~0"
                                                                ).replace(
                                                                  /\//g,
                                                                  "~1"
                                                                ) + "/" + _e.replace(
                                                                  /~/g,
                                                                  "~0"
                                                                ).replace(
                                                                  /\//g,
                                                                  "~1"
                                                                ),
                                                                parentData: B,
                                                                parentDataProperty: _e,
                                                                rootData: D
                                                              }
                                                            ) || (e = e === null ? C.errors : e.concat(
                                                              C.errors
                                                            ), t = e.length);
                                                        else {
                                                          const _e = {
                                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                              /~/g,
                                                              "~0"
                                                            ).replace(
                                                              /\//g,
                                                              "~1"
                                                            ),
                                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf/4/type",
                                                            keyword: "type",
                                                            params: {
                                                              type: "object"
                                                            },
                                                            message: "must be object"
                                                          };
                                                          e === null ? e = [
                                                            _e
                                                          ] : e.push(
                                                            _e
                                                          ), t++;
                                                        }
                                                        var ce = Pe === t;
                                                        G = G || ce;
                                                      }
                                                    }
                                                  }
                                                }
                                                if (G)
                                                  t = H, e !== null && (H ? e.length = H : e = null);
                                                else {
                                                  const be = {
                                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input/" + F.replace(
                                                      /~/g,
                                                      "~0"
                                                    ).replace(
                                                      /\//g,
                                                      "~1"
                                                    ),
                                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/additionalProperties/anyOf",
                                                    keyword: "anyOf",
                                                    params: {},
                                                    message: "must match a schema in anyOf"
                                                  };
                                                  e === null ? e = [
                                                    be
                                                  ] : e.push(
                                                    be
                                                  ), t++;
                                                }
                                              }
                                            else {
                                              const F = {
                                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/meta_input",
                                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/meta_input/type",
                                                keyword: "type",
                                                params: {
                                                  type: "object"
                                                },
                                                message: "must be object"
                                              };
                                              e === null ? e = [
                                                F
                                              ] : e.push(
                                                F
                                              ), t++;
                                            }
                                          }
                                          if (S.page_template !== void 0 && typeof S.page_template != "string") {
                                            const T = {
                                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v + "/page_template",
                                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/properties/page_template/type",
                                              keyword: "type",
                                              params: {
                                                type: "string"
                                              },
                                              message: "must be string"
                                            };
                                            e === null ? e = [
                                              T
                                            ] : e.push(
                                              T
                                            ), t++;
                                          }
                                        } else {
                                          const T = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf/1/type",
                                            keyword: "type",
                                            params: {
                                              type: "object"
                                            },
                                            message: "must be object"
                                          };
                                          e === null ? e = [
                                            T
                                          ] : e.push(
                                            T
                                          ), t++;
                                        }
                                        var rt = he === t;
                                        Q = Q || rt;
                                      }
                                      if (Q)
                                        t = N, e !== null && (N ? e.length = N : e = null);
                                      else {
                                        const he = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/items/anyOf",
                                          keyword: "anyOf",
                                          params: {},
                                          message: "must match a schema in anyOf"
                                        };
                                        e === null ? e = [
                                          he
                                        ] : e.push(
                                          he
                                        ), t++;
                                      }
                                    }
                                  } else {
                                    const E = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf/2/type",
                                      keyword: "type",
                                      params: {
                                        type: "array"
                                      },
                                      message: "must be array"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                  var Ee = x === t;
                                  O = O || Ee;
                                }
                              }
                              if (O)
                                t = b, e !== null && (b ? e.length = b : e = null);
                              else {
                                const A = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/properties/source/anyOf",
                                  keyword: "anyOf",
                                  params: {},
                                  message: "must match a schema in anyOf"
                                };
                                e === null ? e = [
                                  A
                                ] : e.push(
                                  A
                                ), t++;
                              }
                            }
                          } else {
                            const y = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/1/type",
                              keyword: "type",
                              params: {
                                type: "object"
                              },
                              message: "must be object"
                            };
                            e === null ? e = [y] : e.push(
                              y
                            ), t++;
                          }
                          var ge = u === t;
                          if (c = c || ge, !c) {
                            const y = t;
                            if (f && typeof f == "object" && !Array.isArray(
                              f
                            )) {
                              if (f.authorsMap === void 0) {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/required",
                                  keyword: "required",
                                  params: {
                                    missingProperty: "authorsMap"
                                  },
                                  message: "must have required property 'authorsMap'"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              if (f.authorsMode === void 0) {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/required",
                                  keyword: "required",
                                  params: {
                                    missingProperty: "authorsMode"
                                  },
                                  message: "must have required property 'authorsMode'"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              if (f.source === void 0) {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/required",
                                  keyword: "required",
                                  params: {
                                    missingProperty: "source"
                                  },
                                  message: "must have required property 'source'"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              if (f.type === void 0) {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/required",
                                  keyword: "required",
                                  params: {
                                    missingProperty: "type"
                                  },
                                  message: "must have required property 'type'"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              for (const O in f)
                                if (!te.call(
                                  M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[2].properties,
                                  O
                                )) {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/additionalProperties",
                                    keyword: "additionalProperties",
                                    params: {
                                      additionalProperty: O
                                    },
                                    message: "must NOT have additional properties"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              if (f.authorsMode !== void 0) {
                                let O = f.authorsMode;
                                if (typeof O != "string") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMode",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/authorsMode/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                                if (O !== "map") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMode",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/authorsMode/const",
                                    keyword: "const",
                                    params: {
                                      allowedValue: "map"
                                    },
                                    message: "must be equal to constant"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.authorsMap !== void 0) {
                                let O = f.authorsMap;
                                if (O && typeof O == "object" && !Array.isArray(
                                  O
                                )) {
                                  for (const d in O)
                                    if (typeof O[d] != "string") {
                                      const A = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMap/" + d.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/authorsMap/additionalProperties/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string"
                                      };
                                      e === null ? e = [
                                        A
                                      ] : e.push(
                                        A
                                      ), t++;
                                    }
                                } else {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMap",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/authorsMap/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.urlsMode !== void 0) {
                                let O = f.urlsMode;
                                if (typeof O != "string") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/urlsMode/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                                if (!(O === "rewrite" || O === "preserve")) {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/urlsMode/enum",
                                    keyword: "enum",
                                    params: {
                                      allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[2].properties.urlsMode.enum
                                    },
                                    message: "must be equal to one of the allowed values"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.urlsMap !== void 0) {
                                let O = f.urlsMap;
                                if (O && typeof O == "object" && !Array.isArray(
                                  O
                                )) {
                                  for (const d in O) {
                                    const A = t;
                                    if (typeof d == "string") {
                                      if (!Z(
                                        d
                                      )) {
                                        const k = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                          schemaPath: "#/definitions/DataSources.URLReference/format",
                                          keyword: "format",
                                          params: {
                                            format: "whatwg-http-url"
                                          },
                                          message: 'must match format "whatwg-http-url"',
                                          propertyName: d
                                        };
                                        e === null ? e = [
                                          k
                                        ] : e.push(
                                          k
                                        ), t++;
                                      }
                                    } else {
                                      const k = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                        schemaPath: "#/definitions/DataSources.URLReference/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string",
                                        propertyName: d
                                      };
                                      e === null ? e = [
                                        k
                                      ] : e.push(
                                        k
                                      ), t++;
                                    }
                                    var Ot = A === t;
                                    if (!Ot) {
                                      const k = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/urlsMap/propertyNames",
                                        keyword: "propertyNames",
                                        params: {
                                          propertyName: d
                                        },
                                        message: "property name must be valid"
                                      };
                                      e === null ? e = [
                                        k
                                      ] : e.push(
                                        k
                                      ), t++;
                                    }
                                  }
                                  for (const d in O) {
                                    let A = O[d];
                                    if (typeof A == "string") {
                                      if (!Z(
                                        A
                                      )) {
                                        const k = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + d.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/definitions/DataSources.URLReference/format",
                                          keyword: "format",
                                          params: {
                                            format: "whatwg-http-url"
                                          },
                                          message: 'must match format "whatwg-http-url"'
                                        };
                                        e === null ? e = [
                                          k
                                        ] : e.push(
                                          k
                                        ), t++;
                                      }
                                    } else {
                                      const k = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + d.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        schemaPath: "#/definitions/DataSources.URLReference/type",
                                        keyword: "type",
                                        params: {
                                          type: "string"
                                        },
                                        message: "must be string"
                                      };
                                      e === null ? e = [
                                        k
                                      ] : e.push(
                                        k
                                      ), t++;
                                    }
                                  }
                                } else {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/urlsMap/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.type !== void 0) {
                                let O = f.type;
                                if (typeof O != "string") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/type/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                                if (O !== "wxr") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/type/const",
                                    keyword: "const",
                                    params: {
                                      allowedValue: "wxr"
                                    },
                                    message: "must be equal to constant"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.source !== void 0) {
                                let O = f.source;
                                const d = t;
                                let A = !1;
                                const k = t;
                                R(
                                  O,
                                  {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                    parentData: f,
                                    parentDataProperty: "source",
                                    rootData: D
                                  }
                                ) || (e = e === null ? R.errors : e.concat(
                                  R.errors
                                ), t = e.length);
                                var it = k === t;
                                if (A = A || it, !A) {
                                  const x = t;
                                  if (Array.isArray(
                                    O
                                  )) {
                                    const E = O.length;
                                    for (let v = 0; v < E; v++)
                                      R(
                                        O[v],
                                        {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + v,
                                          parentData: O,
                                          parentDataProperty: v,
                                          rootData: D
                                        }
                                      ) || (e = e === null ? R.errors : e.concat(
                                        R.errors
                                      ), t = e.length);
                                  } else {
                                    const E = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/source/anyOf/1/type",
                                      keyword: "type",
                                      params: {
                                        type: "array"
                                      },
                                      message: "must be array"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                  var it = x === t;
                                  A = A || it;
                                }
                                if (A)
                                  t = d, e !== null && (d ? e.length = d : e = null);
                                else {
                                  const x = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/source/anyOf",
                                    keyword: "anyOf",
                                    params: {},
                                    message: "must match a schema in anyOf"
                                  };
                                  e === null ? e = [
                                    x
                                  ] : e.push(
                                    x
                                  ), t++;
                                }
                              }
                              if (f.staticAssets !== void 0) {
                                let O = f.staticAssets;
                                if (typeof O != "string") {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/staticAssets",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/staticAssets/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                                if (!(O === "fetch" || O === "hotlink")) {
                                  const d = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/staticAssets",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/staticAssets/enum",
                                    keyword: "enum",
                                    params: {
                                      allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[2].properties.staticAssets.enum
                                    },
                                    message: "must be equal to one of the allowed values"
                                  };
                                  e === null ? e = [
                                    d
                                  ] : e.push(
                                    d
                                  ), t++;
                                }
                              }
                              if (f.defaultAuthorUsername !== void 0 && typeof f.defaultAuthorUsername != "string") {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/defaultAuthorUsername",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/defaultAuthorUsername/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              if (f.importUsers !== void 0 && typeof f.importUsers != "boolean") {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/importUsers",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/importUsers/type",
                                  keyword: "type",
                                  params: {
                                    type: "boolean"
                                  },
                                  message: "must be boolean"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                              if (f.importComments !== void 0 && typeof f.importComments != "boolean") {
                                const O = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/importComments",
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/properties/importComments/type",
                                  keyword: "type",
                                  params: {
                                    type: "boolean"
                                  },
                                  message: "must be boolean"
                                };
                                e === null ? e = [
                                  O
                                ] : e.push(
                                  O
                                ), t++;
                              }
                            } else {
                              const O = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/2/type",
                                keyword: "type",
                                params: {
                                  type: "object"
                                },
                                message: "must be object"
                              };
                              e === null ? e = [
                                O
                              ] : e.push(
                                O
                              ), t++;
                            }
                            var ge = y === t;
                            if (c = c || ge, !c) {
                              const O = t;
                              if (f && typeof f == "object" && !Array.isArray(
                                f
                              )) {
                                if (f.source === void 0) {
                                  const A = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/required",
                                    keyword: "required",
                                    params: {
                                      missingProperty: "source"
                                    },
                                    message: "must have required property 'source'"
                                  };
                                  e === null ? e = [
                                    A
                                  ] : e.push(
                                    A
                                  ), t++;
                                }
                                if (f.type === void 0) {
                                  const A = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/required",
                                    keyword: "required",
                                    params: {
                                      missingProperty: "type"
                                    },
                                    message: "must have required property 'type'"
                                  };
                                  e === null ? e = [
                                    A
                                  ] : e.push(
                                    A
                                  ), t++;
                                }
                                for (const A in f)
                                  if (!te.call(
                                    M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[3].properties,
                                    A
                                  )) {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/additionalProperties",
                                      keyword: "additionalProperties",
                                      params: {
                                        additionalProperty: A
                                      },
                                      message: "must NOT have additional properties"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                if (f.authorsMode !== void 0) {
                                  let A = f.authorsMode;
                                  if (typeof A != "string") {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMode",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/authorsMode/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                  if (!(A === "create" || A === "default-author")) {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMode",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/authorsMode/enum",
                                      keyword: "enum",
                                      params: {
                                        allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[3].properties.authorsMode.enum
                                      },
                                      message: "must be equal to one of the allowed values"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.authorsMap !== void 0) {
                                  let A = f.authorsMap;
                                  if (A && typeof A == "object" && !Array.isArray(
                                    A
                                  )) {
                                    for (const k in A)
                                      if (typeof A[k] != "string") {
                                        const x = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMap/" + k.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/authorsMap/additionalProperties/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        };
                                        e === null ? e = [
                                          x
                                        ] : e.push(
                                          x
                                        ), t++;
                                      }
                                  } else {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/authorsMap",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/authorsMap/type",
                                      keyword: "type",
                                      params: {
                                        type: "object"
                                      },
                                      message: "must be object"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.urlsMode !== void 0) {
                                  let A = f.urlsMode;
                                  if (typeof A != "string") {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/urlsMode/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                  if (!(A === "rewrite" || A === "preserve")) {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMode",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/urlsMode/enum",
                                      keyword: "enum",
                                      params: {
                                        allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[3].properties.urlsMode.enum
                                      },
                                      message: "must be equal to one of the allowed values"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.urlsMap !== void 0) {
                                  let A = f.urlsMap;
                                  if (A && typeof A == "object" && !Array.isArray(
                                    A
                                  )) {
                                    for (const k in A) {
                                      const x = t;
                                      if (typeof k == "string") {
                                        if (!Z(
                                          k
                                        )) {
                                          const w = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                            schemaPath: "#/definitions/DataSources.URLReference/format",
                                            keyword: "format",
                                            params: {
                                              format: "whatwg-http-url"
                                            },
                                            message: 'must match format "whatwg-http-url"',
                                            propertyName: k
                                          };
                                          e === null ? e = [
                                            w
                                          ] : e.push(
                                            w
                                          ), t++;
                                        }
                                      } else {
                                        const w = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                          schemaPath: "#/definitions/DataSources.URLReference/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string",
                                          propertyName: k
                                        };
                                        e === null ? e = [
                                          w
                                        ] : e.push(
                                          w
                                        ), t++;
                                      }
                                      var At = x === t;
                                      if (!At) {
                                        const w = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/urlsMap/propertyNames",
                                          keyword: "propertyNames",
                                          params: {
                                            propertyName: k
                                          },
                                          message: "property name must be valid"
                                        };
                                        e === null ? e = [
                                          w
                                        ] : e.push(
                                          w
                                        ), t++;
                                      }
                                    }
                                    for (const k in A) {
                                      let x = A[k];
                                      if (typeof x == "string") {
                                        if (!Z(
                                          x
                                        )) {
                                          const w = {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + k.replace(
                                              /~/g,
                                              "~0"
                                            ).replace(
                                              /\//g,
                                              "~1"
                                            ),
                                            schemaPath: "#/definitions/DataSources.URLReference/format",
                                            keyword: "format",
                                            params: {
                                              format: "whatwg-http-url"
                                            },
                                            message: 'must match format "whatwg-http-url"'
                                          };
                                          e === null ? e = [
                                            w
                                          ] : e.push(
                                            w
                                          ), t++;
                                        }
                                      } else {
                                        const w = {
                                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap/" + k.replace(
                                            /~/g,
                                            "~0"
                                          ).replace(
                                            /\//g,
                                            "~1"
                                          ),
                                          schemaPath: "#/definitions/DataSources.URLReference/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        };
                                        e === null ? e = [
                                          w
                                        ] : e.push(
                                          w
                                        ), t++;
                                      }
                                    }
                                  } else {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/urlsMap",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/urlsMap/type",
                                      keyword: "type",
                                      params: {
                                        type: "object"
                                      },
                                      message: "must be object"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.type !== void 0) {
                                  let A = f.type;
                                  if (typeof A != "string") {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/type/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                  if (A !== "wxr") {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/type",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/type/const",
                                      keyword: "const",
                                      params: {
                                        allowedValue: "wxr"
                                      },
                                      message: "must be equal to constant"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.source !== void 0) {
                                  let A = f.source;
                                  const k = t;
                                  let x = !1;
                                  const w = t;
                                  R(
                                    A,
                                    {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                      parentData: f,
                                      parentDataProperty: "source",
                                      rootData: D
                                    }
                                  ) || (e = e === null ? R.errors : e.concat(
                                    R.errors
                                  ), t = e.length);
                                  var at = w === t;
                                  if (x = x || at, !x) {
                                    const E = t;
                                    if (Array.isArray(
                                      A
                                    )) {
                                      const S = A.length;
                                      for (let N = 0; N < S; N++)
                                        R(
                                          A[N],
                                          {
                                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source/" + N,
                                            parentData: A,
                                            parentDataProperty: N,
                                            rootData: D
                                          }
                                        ) || (e = e === null ? R.errors : e.concat(
                                          R.errors
                                        ), t = e.length);
                                    } else {
                                      const S = {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/source/anyOf/1/type",
                                        keyword: "type",
                                        params: {
                                          type: "array"
                                        },
                                        message: "must be array"
                                      };
                                      e === null ? e = [
                                        S
                                      ] : e.push(
                                        S
                                      ), t++;
                                    }
                                    var at = E === t;
                                    x = x || at;
                                  }
                                  if (x)
                                    t = k, e !== null && (k ? e.length = k : e = null);
                                  else {
                                    const E = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/source",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/source/anyOf",
                                      keyword: "anyOf",
                                      params: {},
                                      message: "must match a schema in anyOf"
                                    };
                                    e === null ? e = [
                                      E
                                    ] : e.push(
                                      E
                                    ), t++;
                                  }
                                }
                                if (f.staticAssets !== void 0) {
                                  let A = f.staticAssets;
                                  if (typeof A != "string") {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/staticAssets",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/staticAssets/type",
                                      keyword: "type",
                                      params: {
                                        type: "string"
                                      },
                                      message: "must be string"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                  if (!(A === "fetch" || A === "hotlink")) {
                                    const k = {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/staticAssets",
                                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/staticAssets/enum",
                                      keyword: "enum",
                                      params: {
                                        allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[5].properties.content.items.anyOf[3].properties.staticAssets.enum
                                      },
                                      message: "must be equal to one of the allowed values"
                                    };
                                    e === null ? e = [
                                      k
                                    ] : e.push(
                                      k
                                    ), t++;
                                  }
                                }
                                if (f.defaultAuthorUsername !== void 0 && typeof f.defaultAuthorUsername != "string") {
                                  const A = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/defaultAuthorUsername",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/defaultAuthorUsername/type",
                                    keyword: "type",
                                    params: {
                                      type: "string"
                                    },
                                    message: "must be string"
                                  };
                                  e === null ? e = [
                                    A
                                  ] : e.push(
                                    A
                                  ), t++;
                                }
                                if (f.importUsers !== void 0 && typeof f.importUsers != "boolean") {
                                  const A = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/importUsers",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/importUsers/type",
                                    keyword: "type",
                                    params: {
                                      type: "boolean"
                                    },
                                    message: "must be boolean"
                                  };
                                  e === null ? e = [
                                    A
                                  ] : e.push(
                                    A
                                  ), t++;
                                }
                                if (f.importComments !== void 0 && typeof f.importComments != "boolean") {
                                  const A = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n + "/importComments",
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/properties/importComments/type",
                                    keyword: "type",
                                    params: {
                                      type: "boolean"
                                    },
                                    message: "must be boolean"
                                  };
                                  e === null ? e = [
                                    A
                                  ] : e.push(
                                    A
                                  ), t++;
                                }
                              } else {
                                const A = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf/3/type",
                                  keyword: "type",
                                  params: {
                                    type: "object"
                                  },
                                  message: "must be object"
                                };
                                e === null ? e = [
                                  A
                                ] : e.push(
                                  A
                                ), t++;
                              }
                              var ge = O === t;
                              c = c || ge;
                            }
                          }
                        }
                        if (c)
                          t = _, e !== null && (_ ? e.length = _ : e = null);
                        else {
                          const u = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/content/" + n,
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/items/anyOf",
                            keyword: "anyOf",
                            params: {},
                            message: "must match a schema in anyOf"
                          };
                          e === null ? e = [u] : e.push(u), t++;
                        }
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/content",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/properties/content/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/5/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "importMedia")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.media === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/required",
                      keyword: "required",
                      params: {
                        missingProperty: "media"
                      },
                      message: "must have required property 'media'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "media")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "importMedia") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "importMedia"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.media !== void 0) {
                    let i = o.media;
                    if (Array.isArray(i)) {
                      const a = i.length;
                      for (let n = 0; n < a; n++) {
                        let f = i[n];
                        const _ = t;
                        let c = !1;
                        const l = t;
                        R(f, {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n,
                          parentData: i,
                          parentDataProperty: n,
                          rootData: D
                        }) || (e = e === null ? R.errors : e.concat(
                          R.errors
                        ), t = e.length);
                        var ot = l === t;
                        if (c = c || ot, !c) {
                          const u = t;
                          if (f && typeof f == "object" && !Array.isArray(f)) {
                            if (f.source === void 0) {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n,
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/required",
                                keyword: "required",
                                params: {
                                  missingProperty: "source"
                                },
                                message: "must have required property 'source'"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            for (const y in f)
                              if (!(y === "source" || y === "title" || y === "description" || y === "alt" || y === "caption")) {
                                const b = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n,
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/additionalProperties",
                                  keyword: "additionalProperties",
                                  params: {
                                    additionalProperty: y
                                  },
                                  message: "must NOT have additional properties"
                                };
                                e === null ? e = [
                                  b
                                ] : e.push(
                                  b
                                ), t++;
                              }
                            if (f.source !== void 0 && (R(
                              f.source,
                              {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n + "/source",
                                parentData: f,
                                parentDataProperty: "source",
                                rootData: D
                              }
                            ) || (e = e === null ? R.errors : e.concat(
                              R.errors
                            ), t = e.length)), f.title !== void 0 && typeof f.title != "string") {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n + "/title",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/properties/title/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            if (f.description !== void 0 && typeof f.description != "string") {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n + "/description",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/properties/description/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            if (f.alt !== void 0 && typeof f.alt != "string") {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n + "/alt",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/properties/alt/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                            if (f.caption !== void 0 && typeof f.caption != "string") {
                              const y = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n + "/caption",
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/properties/caption/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              };
                              e === null ? e = [
                                y
                              ] : e.push(
                                y
                              ), t++;
                            }
                          } else {
                            const y = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n,
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf/1/type",
                              keyword: "type",
                              params: {
                                type: "object"
                              },
                              message: "must be object"
                            };
                            e === null ? e = [y] : e.push(
                              y
                            ), t++;
                          }
                          var ot = u === t;
                          c = c || ot;
                        }
                        if (c)
                          t = _, e !== null && (_ ? e.length = _ : e = null);
                        else {
                          const u = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/media/" + n,
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/items/anyOf",
                            keyword: "anyOf",
                            params: {},
                            message: "must match a schema in anyOf"
                          };
                          e === null ? e = [u] : e.push(u), t++;
                        }
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/media",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/properties/media/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/6/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "importThemeStarterContent")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "themeSlug")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "importThemeStarterContent") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "importThemeStarterContent"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.themeSlug !== void 0 && typeof o.themeSlug != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/themeSlug",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/properties/themeSlug/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/7/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "installPlugin")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.source === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "source" || i === "active" || i === "activationOptions" || i === "targetDirectoryName" || i === "onError" || i === "ifAlreadyInstalled" || i === "humanReadableName" || i === "step")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.source !== void 0) {
                    let i = o.source;
                    const a = t;
                    let n = !1;
                    const f = t;
                    W(i, {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? W.errors : e.concat(
                      W.errors
                    ), t = e.length);
                    var nt = f === t;
                    if (n = n || nt, !n) {
                      const _ = t;
                      ie(i, {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                        parentData: o,
                        parentDataProperty: "source",
                        rootData: D
                      }) || (e = e === null ? ie.errors : e.concat(
                        ie.errors
                      ), t = e.length);
                      var nt = _ === t;
                      n = n || nt;
                    }
                    if (n)
                      t = a, e !== null && (a ? e.length = a : e = null);
                    else {
                      const _ = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [_] : e.push(_), t++;
                    }
                  }
                  if (o.active !== void 0 && typeof o.active != "boolean") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/active",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/active/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.activationOptions !== void 0) {
                    let i = o.activationOptions;
                    if (i && typeof i == "object" && !Array.isArray(i))
                      for (const a in i) {
                        let n = i[a];
                        const f = t;
                        let _ = !1;
                        const c = t;
                        if (typeof n != "string") {
                          const l = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf/0/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(l), t++;
                        }
                        var me = c === t;
                        if (_ = _ || me, !_) {
                          const l = t;
                          if (typeof n != "boolean") {
                            const g = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf/1/type",
                              keyword: "type",
                              params: {
                                type: "boolean"
                              },
                              message: "must be boolean"
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                          var me = l === t;
                          if (_ = _ || me, !_) {
                            const g = t;
                            if (!(typeof n == "number" && isFinite(
                              n
                            ))) {
                              const b = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ),
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf/2/type",
                                keyword: "type",
                                params: {
                                  type: "number"
                                },
                                message: "must be number"
                              };
                              e === null ? e = [
                                b
                              ] : e.push(
                                b
                              ), t++;
                            }
                            var me = g === t;
                            if (_ = _ || me, !_) {
                              const b = t;
                              if (Array.isArray(
                                n
                              )) {
                                const d = n.length;
                                for (let A = 0; A < d; A++)
                                  C(
                                    n[A],
                                    {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/" + A,
                                      parentData: n,
                                      parentDataProperty: A,
                                      rootData: D
                                    }
                                  ) || (e = e === null ? C.errors : e.concat(
                                    C.errors
                                  ), t = e.length);
                              } else {
                                const d = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf/3/type",
                                  keyword: "type",
                                  params: {
                                    type: "array"
                                  },
                                  message: "must be array"
                                };
                                e === null ? e = [
                                  d
                                ] : e.push(
                                  d
                                ), t++;
                              }
                              var me = b === t;
                              if (_ = _ || me, !_) {
                                const d = t;
                                if (n && typeof n == "object" && !Array.isArray(
                                  n
                                ))
                                  for (const k in n)
                                    C(
                                      n[k],
                                      {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/" + k.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        parentData: n,
                                        parentDataProperty: k,
                                        rootData: D
                                      }
                                    ) || (e = e === null ? C.errors : e.concat(
                                      C.errors
                                    ), t = e.length);
                                else {
                                  const k = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ),
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf/4/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    k
                                  ] : e.push(
                                    k
                                  ), t++;
                                }
                                var me = d === t;
                                _ = _ || me;
                              }
                            }
                          }
                        }
                        if (_)
                          t = f, e !== null && (f ? e.length = f : e = null);
                        else {
                          const l = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/additionalProperties/anyOf",
                            keyword: "anyOf",
                            params: {},
                            message: "must match a schema in anyOf"
                          };
                          e === null ? e = [l] : e.push(l), t++;
                        }
                      }
                    else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/activationOptions",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/activationOptions/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.targetDirectoryName !== void 0) {
                    let i = o.targetDirectoryName;
                    if (typeof i == "string") {
                      if (!ae.test(i)) {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/targetDirectoryName",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/targetDirectoryName/pattern",
                          keyword: "pattern",
                          params: {
                            pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                          },
                          message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/targetDirectoryName",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/targetDirectoryName/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.onError !== void 0) {
                    let i = o.onError;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/onError",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/onError/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (!(i === "skip-plugin" || i === "throw")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/onError",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/onError/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[8].properties.onError.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.ifAlreadyInstalled !== void 0) {
                    let i = o.ifAlreadyInstalled;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/ifAlreadyInstalled",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/ifAlreadyInstalled/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (!(i === "overwrite" || i === "skip" || i === "error")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/ifAlreadyInstalled",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/ifAlreadyInstalled/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[8].properties.ifAlreadyInstalled.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/humanReadableName",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/humanReadableName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "installPlugin") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "installPlugin"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/8/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "installTheme")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.source === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "source" || i === "importStarterContent" || i === "targetDirectoryName" || i === "onError" || i === "ifAlreadyInstalled" || i === "humanReadableName" || i === "step" || i === "active")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.source !== void 0) {
                    let i = o.source;
                    const a = t;
                    let n = !1;
                    const f = t;
                    ee(i, {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                      parentData: o,
                      parentDataProperty: "source",
                      rootData: D
                    }) || (e = e === null ? ee.errors : e.concat(
                      ee.errors
                    ), t = e.length);
                    var pt = f === t;
                    if (n = n || pt, !n) {
                      const _ = t;
                      W(i, {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                        parentData: o,
                        parentDataProperty: "source",
                        rootData: D
                      }) || (e = e === null ? W.errors : e.concat(
                        W.errors
                      ), t = e.length);
                      var pt = _ === t;
                      n = n || pt;
                    }
                    if (n)
                      t = a, e !== null && (a ? e.length = a : e = null);
                    else {
                      const _ = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/source/anyOf",
                        keyword: "anyOf",
                        params: {},
                        message: "must match a schema in anyOf"
                      };
                      e === null ? e = [_] : e.push(_), t++;
                    }
                  }
                  if (o.importStarterContent !== void 0 && typeof o.importStarterContent != "boolean") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/importStarterContent",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/importStarterContent/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.targetDirectoryName !== void 0) {
                    let i = o.targetDirectoryName;
                    if (typeof i == "string") {
                      if (!ae.test(i)) {
                        const a = {
                          instancePath: s + "/additionalStepsAfterExecution/" + r + "/targetDirectoryName",
                          schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/targetDirectoryName/pattern",
                          keyword: "pattern",
                          params: {
                            pattern: "^(?!(?:\\.|\\.\\.)$)[^/]+$"
                          },
                          message: 'must match pattern "^(?!(?:\\.|\\.\\.)$)[^/]+$"'
                        };
                        e === null ? e = [a] : e.push(a), t++;
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/targetDirectoryName",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/targetDirectoryName/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.onError !== void 0) {
                    let i = o.onError;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/onError",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/onError/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (!(i === "skip-theme" || i === "throw")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/onError",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/onError/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[9].properties.onError.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.ifAlreadyInstalled !== void 0) {
                    let i = o.ifAlreadyInstalled;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/ifAlreadyInstalled",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/ifAlreadyInstalled/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (!(i === "overwrite" || i === "skip" || i === "error")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/ifAlreadyInstalled",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/ifAlreadyInstalled/enum",
                        keyword: "enum",
                        params: {
                          allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[9].properties.ifAlreadyInstalled.enum
                        },
                        message: "must be equal to one of the allowed values"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.humanReadableName !== void 0 && typeof o.humanReadableName != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/humanReadableName",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/humanReadableName/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "installTheme") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "installTheme"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.active !== void 0 && typeof o.active != "boolean") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/active",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/properties/active/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/9/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "mkdir")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.path === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/required",
                      keyword: "required",
                      params: { missingProperty: "path" },
                      message: "must have required property 'path'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "path")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "mkdir") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "mkdir"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.path !== void 0 && typeof o.path != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/path",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/properties/path/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/10/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "mv")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.fromPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/required",
                      keyword: "required",
                      params: {
                        missingProperty: "fromPath"
                      },
                      message: "must have required property 'fromPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.toPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/required",
                      keyword: "required",
                      params: {
                        missingProperty: "toPath"
                      },
                      message: "must have required property 'toPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "fromPath" || i === "toPath")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "mv") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/properties/step/const",
                        keyword: "const",
                        params: { allowedValue: "mv" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.fromPath !== void 0 && typeof o.fromPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/fromPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/properties/fromPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.toPath !== void 0 && typeof o.toPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/toPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/properties/toPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/11/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "rm")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.path === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/required",
                      keyword: "required",
                      params: { missingProperty: "path" },
                      message: "must have required property 'path'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "path")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "rm") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/properties/step/const",
                        keyword: "const",
                        params: { allowedValue: "rm" },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.path !== void 0 && typeof o.path != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/path",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/properties/path/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/12/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "rmdir")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.path === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/required",
                      keyword: "required",
                      params: { missingProperty: "path" },
                      message: "must have required property 'path'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "path")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "rmdir") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "rmdir"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.path !== void 0 && typeof o.path != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/path",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/properties/path/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/13/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "resetData")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "contentTypes")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "resetData") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "resetData"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.contentTypes !== void 0) {
                    let i = o.contentTypes;
                    if (Array.isArray(i)) {
                      const a = i.length;
                      for (let n = 0; n < a; n++) {
                        let f = i[n];
                        if (typeof f != "string") {
                          const _ = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/contentTypes/" + n,
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/properties/contentTypes/items/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [_] : e.push(_), t++;
                        }
                        if (!(f === "posts" || f === "pages" || f === "comments")) {
                          const _ = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/contentTypes/" + n,
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/properties/contentTypes/items/enum",
                            keyword: "enum",
                            params: {
                              allowedValues: M.properties.additionalStepsAfterExecution.items.oneOf[14].properties.contentTypes.items.enum
                            },
                            message: "must be equal to one of the allowed values"
                          };
                          e === null ? e = [_] : e.push(_), t++;
                        }
                      }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/contentTypes",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/properties/contentTypes/type",
                        keyword: "type",
                        params: { type: "array" },
                        message: "must be array"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/14/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "runPHP")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.code === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/required",
                      keyword: "required",
                      params: { missingProperty: "code" },
                      message: "must have required property 'code'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "code" || i === "env")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "runPHP") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "runPHP"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.code !== void 0 && (R(o.code, {
                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/code",
                    parentData: o,
                    parentDataProperty: "code",
                    rootData: D
                  }) || (e = e === null ? R.errors : e.concat(
                    R.errors
                  ), t = e.length)), o.env !== void 0) {
                    let i = o.env;
                    if (i && typeof i == "object" && !Array.isArray(i)) {
                      for (const a in i)
                        if (typeof i[a] != "string") {
                          const n = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/env/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/properties/env/additionalProperties/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [n] : e.push(n), t++;
                        }
                    } else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/env",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/properties/env/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/15/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "runSQL")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.source === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/required",
                      keyword: "required",
                      params: {
                        missingProperty: "source"
                      },
                      message: "must have required property 'source'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "source")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "runSQL") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "runSQL"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  o.source !== void 0 && (R(o.source, {
                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/source",
                    parentData: o,
                    parentDataProperty: "source",
                    rootData: D
                  }) || (e = e === null ? R.errors : e.concat(
                    R.errors
                  ), t = e.length));
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/16/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "setSiteLanguage")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.language === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/required",
                      keyword: "required",
                      params: {
                        missingProperty: "language"
                      },
                      message: "must have required property 'language'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "language")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "setSiteLanguage") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "setSiteLanguage"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.language !== void 0 && typeof o.language != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/language",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/properties/language/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/17/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "setSiteOptions")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.options === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/required",
                      keyword: "required",
                      params: {
                        missingProperty: "options"
                      },
                      message: "must have required property 'options'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "options")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "setSiteOptions") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "setSiteOptions"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.options !== void 0) {
                    let i = o.options;
                    if (i && typeof i == "object" && !Array.isArray(i))
                      for (const a in i) {
                        let n = i[a];
                        const f = t;
                        let _ = !1;
                        const c = t;
                        if (typeof n != "string") {
                          const l = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf/0/type",
                            keyword: "type",
                            params: {
                              type: "string"
                            },
                            message: "must be string"
                          };
                          e === null ? e = [l] : e.push(l), t++;
                        }
                        var de = c === t;
                        if (_ = _ || de, !_) {
                          const l = t;
                          if (typeof n != "boolean") {
                            const g = {
                              instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                /~/g,
                                "~0"
                              ).replace(
                                /\//g,
                                "~1"
                              ),
                              schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf/1/type",
                              keyword: "type",
                              params: {
                                type: "boolean"
                              },
                              message: "must be boolean"
                            };
                            e === null ? e = [g] : e.push(
                              g
                            ), t++;
                          }
                          var de = l === t;
                          if (_ = _ || de, !_) {
                            const g = t;
                            if (!(typeof n == "number" && isFinite(
                              n
                            ))) {
                              const b = {
                                instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ),
                                schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf/2/type",
                                keyword: "type",
                                params: {
                                  type: "number"
                                },
                                message: "must be number"
                              };
                              e === null ? e = [
                                b
                              ] : e.push(
                                b
                              ), t++;
                            }
                            var de = g === t;
                            if (_ = _ || de, !_) {
                              const b = t;
                              if (Array.isArray(
                                n
                              )) {
                                const d = n.length;
                                for (let A = 0; A < d; A++)
                                  C(
                                    n[A],
                                    {
                                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                        /~/g,
                                        "~0"
                                      ).replace(
                                        /\//g,
                                        "~1"
                                      ) + "/" + A,
                                      parentData: n,
                                      parentDataProperty: A,
                                      rootData: D
                                    }
                                  ) || (e = e === null ? C.errors : e.concat(
                                    C.errors
                                  ), t = e.length);
                              } else {
                                const d = {
                                  instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf/3/type",
                                  keyword: "type",
                                  params: {
                                    type: "array"
                                  },
                                  message: "must be array"
                                };
                                e === null ? e = [
                                  d
                                ] : e.push(
                                  d
                                ), t++;
                              }
                              var de = b === t;
                              if (_ = _ || de, !_) {
                                const d = t;
                                if (n && typeof n == "object" && !Array.isArray(
                                  n
                                ))
                                  for (const k in n)
                                    C(
                                      n[k],
                                      {
                                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ) + "/" + k.replace(
                                          /~/g,
                                          "~0"
                                        ).replace(
                                          /\//g,
                                          "~1"
                                        ),
                                        parentData: n,
                                        parentDataProperty: k,
                                        rootData: D
                                      }
                                    ) || (e = e === null ? C.errors : e.concat(
                                      C.errors
                                    ), t = e.length);
                                else {
                                  const k = {
                                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                                      /~/g,
                                      "~0"
                                    ).replace(
                                      /\//g,
                                      "~1"
                                    ),
                                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf/4/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  };
                                  e === null ? e = [
                                    k
                                  ] : e.push(
                                    k
                                  ), t++;
                                }
                                var de = d === t;
                                _ = _ || de;
                              }
                            }
                          }
                        }
                        if (_)
                          t = f, e !== null && (f ? e.length = f : e = null);
                        else {
                          const l = {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/options/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/additionalProperties/anyOf",
                            keyword: "anyOf",
                            params: {},
                            message: "must match a schema in anyOf"
                          };
                          e === null ? e = [l] : e.push(l), t++;
                        }
                      }
                    else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/options",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/properties/options/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/18/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "unzip")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.zipFile === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/required",
                      keyword: "required",
                      params: {
                        missingProperty: "zipFile"
                      },
                      message: "must have required property 'zipFile'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.extractToPath === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/required",
                      keyword: "required",
                      params: {
                        missingProperty: "extractToPath"
                      },
                      message: "must have required property 'extractToPath'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "zipFile" || i === "extractToPath")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "unzip") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "unzip"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.zipFile !== void 0 && (R(o.zipFile, {
                    instancePath: s + "/additionalStepsAfterExecution/" + r + "/zipFile",
                    parentData: o,
                    parentDataProperty: "zipFile",
                    rootData: D
                  }) || (e = e === null ? R.errors : e.concat(
                    R.errors
                  ), t = e.length)), o.extractToPath !== void 0 && typeof o.extractToPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/extractToPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/properties/extractToPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/19/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "wp-cli")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.command === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/required",
                      keyword: "required",
                      params: {
                        missingProperty: "command"
                      },
                      message: "must have required property 'command'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "command" || i === "wpCliPath")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "wp-cli") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "wp-cli"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.command !== void 0 && typeof o.command != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/command",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/properties/command/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.wpCliPath !== void 0 && typeof o.wpCliPath != "string") {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r + "/wpCliPath",
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/properties/wpCliPath/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/20/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else if (P === "writeFiles")
                if (o && typeof o == "object" && !Array.isArray(o)) {
                  if (o.step === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/required",
                      keyword: "required",
                      params: { missingProperty: "step" },
                      message: "must have required property 'step'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  if (o.files === void 0) {
                    const i = {
                      instancePath: s + "/additionalStepsAfterExecution/" + r,
                      schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/required",
                      keyword: "required",
                      params: {
                        missingProperty: "files"
                      },
                      message: "must have required property 'files'"
                    };
                    e === null ? e = [i] : e.push(i), t++;
                  }
                  for (const i in o)
                    if (!(i === "step" || i === "files")) {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r,
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/additionalProperties",
                        keyword: "additionalProperties",
                        params: {
                          additionalProperty: i
                        },
                        message: "must NOT have additional properties"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  if (o.step !== void 0) {
                    let i = o.step;
                    if (typeof i != "string") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/properties/step/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                    if (i !== "writeFiles") {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/step",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/properties/step/const",
                        keyword: "const",
                        params: {
                          allowedValue: "writeFiles"
                        },
                        message: "must be equal to constant"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                  if (o.files !== void 0) {
                    let i = o.files;
                    if (i && typeof i == "object" && !Array.isArray(i))
                      for (const a in i)
                        W(
                          i[a],
                          {
                            instancePath: s + "/additionalStepsAfterExecution/" + r + "/files/" + a.replace(
                              /~/g,
                              "~0"
                            ).replace(
                              /\//g,
                              "~1"
                            ),
                            parentData: i,
                            parentDataProperty: a,
                            rootData: D
                          }
                        ) || (e = e === null ? W.errors : e.concat(
                          W.errors
                        ), t = e.length);
                    else {
                      const a = {
                        instancePath: s + "/additionalStepsAfterExecution/" + r + "/files",
                        schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/properties/files/type",
                        keyword: "type",
                        params: { type: "object" },
                        message: "must be object"
                      };
                      e === null ? e = [a] : e.push(a), t++;
                    }
                  }
                } else {
                  const i = {
                    instancePath: s + "/additionalStepsAfterExecution/" + r,
                    schemaPath: "#/properties/additionalStepsAfterExecution/items/oneOf/21/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object"
                  };
                  e === null ? e = [i] : e.push(i), t++;
                }
              else {
                const i = {
                  instancePath: s + "/additionalStepsAfterExecution/" + r,
                  schemaPath: "#/properties/additionalStepsAfterExecution/items/discriminator",
                  keyword: "discriminator",
                  params: {
                    error: "mapping",
                    tag: "step",
                    tagValue: P
                  },
                  message: 'value of tag "step" must be in oneOf'
                };
                e === null ? e = [i] : e.push(i), t++;
              }
            else {
              const i = {
                instancePath: s + "/additionalStepsAfterExecution/" + r,
                schemaPath: "#/properties/additionalStepsAfterExecution/items/discriminator",
                keyword: "discriminator",
                params: {
                  error: "tag",
                  tag: "step",
                  tagValue: P
                },
                message: 'tag "step" must be string'
              };
              e === null ? e = [i] : e.push(i), t++;
            }
          } else {
            const P = {
              instancePath: s + "/additionalStepsAfterExecution/" + r,
              schemaPath: "#/properties/additionalStepsAfterExecution/items/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object"
            };
            e === null ? e = [P] : e.push(P), t++;
          }
        }
      } else {
        const p = {
          instancePath: s + "/additionalStepsAfterExecution",
          schemaPath: "#/properties/additionalStepsAfterExecution/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array"
        };
        e === null ? e = [p] : e.push(p), t++;
      }
    }
  } else {
    const m = {
      instancePath: s,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object"
    };
    e === null ? e = [m] : e.push(m), t++;
  }
  return Ie.errors = e, t === 0;
}
function ut(h, { instancePath: s = "", parentData: Y, parentDataProperty: X, rootData: D = h } = {}) {
  let e = null, t = 0;
  return Ie(h, {
    instancePath: s,
    parentData: Y,
    parentDataProperty: X,
    rootData: D
  }) || (e = e === null ? Ie.errors : e.concat(Ie.errors), t = e.length), ut.errors = e, t === 0;
}
function qt(h) {
  const s = jt(h);
  return s.valid ? { valid: !0 } : {
    valid: !1,
    errors: s.errors.map(ht)
  };
}
function jt(h) {
  return ut(h) ? { valid: !0 } : {
    valid: !1,
    errors: Mt(
      ut.errors ?? []
    )
  };
}
function It(h) {
  const s = qt(h);
  if (!s.valid)
    throw new kt(
      Rt(s.errors),
      s.errors
    );
}
function Rt(h) {
  return `Invalid Blueprint v2 declaration:
${h.map(
    (Y, X) => `${X + 1}. At ${Y.path ? `path "${Y.path}"` : "the document root"}: ${Y.message}`
  ).join(`
`)}`;
}
function Mt(h) {
  const s = /* @__PURE__ */ new Map();
  for (const e of h) {
    const t = s.get(e.instancePath) ?? [];
    t.push(e), s.set(e.instancePath, t);
  }
  const Y = /* @__PURE__ */ new Set();
  for (const e of s.keys()) {
    let t = e.lastIndexOf("/");
    for (; t >= 0; ) {
      const I = e.slice(0, t);
      if (s.has(I) && Y.add(I), t === 0)
        break;
      t = e.lastIndexOf("/", t - 1);
    }
  }
  const X = [];
  for (const [e, t] of s)
    Y.has(e) && t.some(ct) || X.push(...$t(t));
  const D = /* @__PURE__ */ new Set();
  return X.filter((e) => {
    const t = ht(e), I = JSON.stringify([t.path, t.message]);
    return D.has(I) ? !1 : (D.add(I), !0);
  });
}
function $t(h) {
  const s = h.filter(ct), Y = h.filter(
    (D) => [
      "additionalProperties",
      "required",
      "discriminator",
      "propertyNames"
    ].includes(D.keyword)
  );
  if (Y.length > 0 && (s.length === 0 || Y.every(
    (D) => D.keyword === "additionalProperties"
  )))
    return Y;
  if (s.length > 0)
    return [Nt(s)];
  const X = h.find((D) => D.keyword !== "type");
  return X ? [X] : h.slice(0, 1);
}
function Nt(h) {
  return h.reduce(
    (s, Y) => Y.schemaPath.length > s.schemaPath.length ? Y : s
  );
}
function ct(h) {
  return h.keyword === "anyOf" || h.keyword === "oneOf";
}
function ht(h) {
  let s = h.instancePath;
  return h.keyword === "additionalProperties" ? s = $e(
    s,
    String(h.params.additionalProperty)
  ) : h.keyword === "required" ? s = $e(
    s,
    String(h.params.missingProperty)
  ) : h.keyword === "discriminator" ? s = $e(s, String(h.params.tag)) : h.keyword === "propertyNames" && (s = $e(
    s,
    String(h.params.propertyName)
  )), {
    path: s,
    message: ct(h) ? "must match one of the allowed forms" : h.message ?? "does not match the Blueprint v2 schema"
  };
}
function $e(h, s) {
  return `${h}/${s.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
export {
  It as assertValidBlueprintV2Declaration,
  qt as validateBlueprintV2,
  jt as validateBlueprintV2Declaration
};
