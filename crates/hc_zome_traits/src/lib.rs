use convert_case::{Case, Casing};
use proc_macro::TokenStream;
use proc_macro2::Literal;
use quote::quote;
use syn::{parse_macro_input, Fields, ItemEnum, ItemImpl, ItemTrait};

#[proc_macro_attribute]
pub fn zome_trait(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as ItemTrait);

    let trait_name = input.ident.clone();
    let hash_var_name = format!("{}_HASH", input.ident)
        .to_case(Case::UpperSnake)
        .parse::<proc_macro2::TokenStream>()
        .unwrap();
    let trait_items = input.items.iter();

    let mut hash = [0; 32];

    blake::hash(256, format!("{:?}", input).as_bytes(), &mut hash).unwrap();

    let hash_value = Literal::byte_string(&hash);
    let len = hash.len();

    let expanded = quote! {
        const #hash_var_name: [u8; #len] = *#hash_value;
        pub trait #trait_name {
            #(#trait_items)*

            const HASH: [u8; #len] = #hash_var_name;
        }
    };

    TokenStream::from(expanded)
}

#[proc_macro_attribute]
pub fn implement_zome_trait_as_externs(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as ItemImpl);

    let (_, trait_, _) = input.trait_.unwrap();
    let struct_name = input.self_ty;

    let fn_items = input.items.into_iter().filter_map(|i| match i {
        syn::ImplItem::Fn(fun) => Some(fun),
        _ => None,
    });

    let items_map_extern = fn_items.clone().map(|item| {
        let fn_name = item.sig.ident;
        let extern_fn_name = format!("__{}", fn_name)
            .parse::<proc_macro2::TokenStream>()
            .unwrap();
        let input = item
            .sig
            .inputs
            .first()
            .expect("hdk_extern functions can only take 1 argument");

        let input_pat_type = match input {
            syn::FnArg::Typed(t) => t,
            _ => panic!("zome trait functions cannot take self as an argument"),
        };
        let input_type = input_pat_type.ty.clone();
        let fn_outputs = item.sig.output;
        quote! {
            #[hdk_extern]
            fn #extern_fn_name(input: #input_type) #fn_outputs {
                #struct_name::#fn_name(input)
            }
        }
    });

    let expanded = quote! {
        impl #trait_ for #struct_name {
            #(#fn_items)*
        }
        #(#items_map_extern)*
    };

    TokenStream::from(expanded)
}

#[proc_macro_attribute]
pub fn implemented_zome_traits(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as ItemEnum);
    let panic_err = "zome traits enum cannot contain anything else that tuple variants with only one type, eg. pub enum ZomeTraits { MutualCredit(HoloFuel) }";
    let variants = input
        .variants
        .into_iter()
        .map(|variant| match variant.fields {
            Fields::Unnamed(unnamed) => {
                let field = unnamed.unnamed.first().expect(panic_err);
                let ty = field.ty.clone();

                quote! {
                    #ty::HASH,
                }
            }
            _ => panic!("{panic_err}"),
        });

    let expanded = quote! {
        #[hdk_extern]
        fn __implemented_zome_traits(_: ()) -> ExternResult<Vec<[u8; 32]>> {
            Ok(vec![#(#variants)*])
        }
    };

    TokenStream::from(expanded)
}
