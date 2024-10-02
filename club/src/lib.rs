use dartfrog_lib::{
    default_load_service, default_save_service, provider_handle_message, update_subscriber,
    update_subscribers, AppServiceState, ChatRequest, ChatServiceState, ChatUpdate,
    DefaultAppClientState, DefaultAppProcessState, ProviderState, Service,
};
use kinode_process_lib::{call_init, http, Address, Request};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

mod constants;

wit_bindgen::generate!({
    path: "target/wit",
    world: "process-v0",
});

type AppProviderState = ProviderState<AppService, DefaultAppClientState, DefaultAppProcessState>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppService {
    pub chat: ChatServiceState,
    pub club: ClubServiceState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppUpdate {
    Chat(ChatUpdate),
    Club(ClubUpdate),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppRequest {
    Chat(ChatRequest),
    Club(ClubRequest),
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub provider: AppProviderState,
}

impl AppState {
    pub fn new(our: &Address) -> Self {
        AppState {
            provider: AppProviderState::new(our),
        }
    }
}

impl AppServiceState for AppService {
    fn new() -> Self {
        AppService {
            chat: ChatServiceState::new(),
            club: ClubServiceState::new(),
        }
    }

    fn init(&mut self, our: &Address, service: &Service) -> anyhow::Result<()> {
        default_load_service::<Self>(our, &service.id.to_string(), self)
    }

    fn save(&mut self, our: &Address, service: &Service) -> anyhow::Result<()> {
        default_save_service::<Self>(our, &service.id.to_string(), self)
    }

    fn handle_subscribe(
        &mut self,
        subscriber_node: String,
        our: &Address,
        service: &Service,
    ) -> anyhow::Result<()> {
        self.chat
            .handle_subscribe(subscriber_node.clone(), our, service)?;
        self.club.handle_subscribe(subscriber_node, our, service)?;
        self.save(our, service)?;
        Ok(())
    }

    fn handle_request(
        &mut self,
        from: String,
        req: String,
        our: &Address,
        service: &Service,
    ) -> anyhow::Result<()> {
        let request = serde_json::from_str::<AppRequest>(&req)?;
        match request {
            AppRequest::Chat(chat_request) => {
                self.chat.handle_request(from, chat_request, our, service)?;
            }
            AppRequest::Club(club_request) => {
                self.club.handle_request(from, club_request, our, service)?;
            }
        }
        self.save(our, service)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClubUpdate {
    /// who & is_join
    Participant(String, bool),
    Participants(HashSet<String>),
    /// single-channel-ified audio & who is speaking
    Audio(Vec<u8>, Vec<String>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClubRequest {
    Participant(bool),
    Audio(Vec<u8>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClubServiceState {
    pub participants: HashSet<String>,
}

impl ClubServiceState {
    fn new() -> Self {
        ClubServiceState {
            participants: HashSet::new(),
        }
    }

    fn handle_subscribe(
        &mut self,
        subscriber_node: String,
        our: &Address,
        service: &Service,
    ) -> anyhow::Result<()> {
        let upd = ClubUpdate::participants(self.participants.clone());
        update_subscriber(AppUpdate::Club(upd), &subscriber_node, our, service)?;
        Ok(())
    }

    fn handle_request(
        &mut self,
        from: String,
        req: ClubRequest,
        our: &Address,
        service: &Service,
    ) -> anyhow::Result<()> {
        let upd = match req {
            ChatRequest::Participant(is_join) => {
                if is_join {
                    self.participants.remove(&is_join);
                } else {
                    self.participants.insert(is_join.clone());
                }
                ClubUpdate::Participant(from, is_join)
            }
            ChatRequest::Audio(audio) => {
                // TODO: we should really be combining audio from
                // different streams into a single channel
                ClubUpdate::Audio(audio, vec![from])
            }
        };
        update_subscribers(AppUpdate::Club(upd), our, service)?;
        Ok(())
    }
}

call_init!(init);
fn init(our: Address) {
    let mut state = AppState::new(&our);
    let loaded_provider = AppProviderState::load(&our);
    state.provider = loaded_provider;

    let try_ui = http::secure_serve_ui(&our, "ui", vec!["/", "*"]);
    http::secure_bind_ws_path("/", true).unwrap();

    match try_ui {
        Ok(()) => {}
        Err(e) => {
            println!("error starting ui: {:?}", e);
        }
    };

    Request::to(("our", "homepage", "homepage", "sys"))
        .body(
            serde_json::json!({
                "Add": {
                    "label": "club",
                    "icon": constants::HOMEPAGE_IMAGE,
                    "path": "/",
                }
            })
            .to_string()
            .as_bytes()
            .to_vec(),
        )
        .send()
        .unwrap();

    loop {
        match provider_handle_message(&our, &mut state.provider) {
            Ok(()) => {}
            Err(e) => {
                println!("error handling message: {:?}", e);
            }
        };
    }
}
